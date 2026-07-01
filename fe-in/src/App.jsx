import { useEffect } from "react";
import axios from "axios";

function App() {

  useEffect(() => {

    axios
      .get("http://127.0.0.1:8000/api/hello")
      .then((response) => {
        console.log(response.data);
      });

  }, []);

  return (
    <h1>Belajar React dan Laravel</h1>
  );
}

export default App;