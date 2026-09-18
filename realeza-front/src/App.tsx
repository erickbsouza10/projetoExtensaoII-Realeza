import AppRoutes from "./routes/AppRoutes";
import Preloader from "./components/Preloader";

function App() {
  return <Preloader><AppRoutes /></Preloader>;
}

export default App;
