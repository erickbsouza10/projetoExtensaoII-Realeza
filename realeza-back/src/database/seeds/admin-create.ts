import 'reflect-metadata';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Transform, plainToInstance } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, validate } from 'class-validator';
import { LoginDto } from '../../modules/auth/auth.dto';
import { MinLength } from 'class-validator';
import { hashPassword } from '../../modules/auth/password';
import { User } from '../../modules/users/user.entity';
import { Role } from '../../common/enums/role.enum';
import dataSource from '../data-source';
import { QueryFailedError } from 'typeorm';
class InputError extends Error {}
class AdminInput extends LoginDto {
  // LoginDto owns the bcrypt byte limit; password minimum is checked separately below.
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
}
class PasswordMinimum {
  @MinLength(8) password!: string;
}
function hiddenPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY)
    throw new InputError(
      'Use um terminal interativo ou --stdin-json por entrada padrão segura. Não passe senha como argumento.',
    );
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.off('data', listener);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const listener = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\u0003' || character === '\u0004') {
          cleanup();
          reject(new InputError('Operação cancelada.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b')
          value = Array.from(value).slice(0, -1).join('');
        else if (character >= ' ' && character !== '\u001b') value += character;
      }
    };
    stdin.on('data', listener);
  });
}
async function input(): Promise<unknown> {
  if (process.argv.includes('--stdin-json')) {
    if (stdin.isTTY) throw new InputError('--stdin-json exige entrada redirecionada.');
    let text = '';
    for await (const chunk of stdin) {
      text += chunk;
      if (Buffer.byteLength(text) > 16384)
        throw new InputError('Entrada administrativa muito grande.');
    }
    return JSON.parse(text);
  }
  if (!stdin.isTTY)
    throw new InputError('Execute admin:create em um terminal interativo ou use --stdin-json.');
  const terminal = createInterface({ input: stdin, output: stdout });
  let name: string, registration: string, email: string;
  try {
    name = await terminal.question('Nome: ');
    registration = await terminal.question('Matrícula: ');
    email = await terminal.question('Email (opcional): ');
  } finally {
    terminal.close();
  }
  const password = await hiddenPassword('Senha (mínimo 8 caracteres, entrada oculta): ');
  const confirmation = await hiddenPassword('Confirmar senha: ');
  if (password !== confirmation) throw new InputError('As senhas não coincidem.');
  return { name, registration, email: email.trim() || undefined, password };
}
async function create() {
  const raw = await input();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new InputError('Entrada inválida.');
  const dto = plainToInstance(AdminInput, raw);
  const errors = [
    ...(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })),
    ...(await validate(plainToInstance(PasswordMinimum, { password: dto.password }))),
  ];
  if (errors.length)
    throw new InputError(
      'Dados inválidos: confira nome, matrícula, email e senha de 8 caracteres até 72 bytes UTF-8.',
    );
  await dataSource.initialize();
  try {
    const repository = dataSource.getRepository(User);
    if (await repository.existsBy({ registration: dto.registration })) {
      console.log('Matrícula já existe. Nenhuma conta foi criada ou promovida.');
      return;
    }
    await repository.save(
      repository.create({
        name: dto.name,
        registration: dto.registration,
        email: dto.email ?? null,
        passwordHash: await hashPassword(dto.password),
        role: Role.SUPER_ADMIN,
        course: null,
        semester: null,
      }),
    );
    console.log(
      'Conta SUPER_ADMIN criada com sucesso. Entre pelo login normal usando a matrícula e senha cadastradas.',
    );
  } catch (error) {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    ) {
      console.log('Matrícula já existe. Nenhuma conta foi criada ou promovida.');
      return;
    }
    throw error;
  } finally {
    await dataSource.destroy();
  }
}
void create().catch((error: unknown) => {
  console.error(
    error instanceof InputError
      ? `Erro: ${error.message}`
      : 'Erro: criação não concluída. Confira a conexão do banco e se as migrations foram executadas.',
  );
  process.exitCode = 1;
});
