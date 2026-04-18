import "./index.css";
import Calendar from "./components/Calendar";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <h1 className="text-2xl font-bold mb-4">
        @ilamy/calendar — Vite Example
      </h1>
      <Calendar />
    </div>
  );
}

export default App;
