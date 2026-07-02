import { useEffect, useState } from "react";
import axios from "axios";

function App() {

    const [users, setUsers] = useState([]);

    useEffect(() => {

        axios.get("http://127.0.0.1:8000/api/hello")
            .then((response) => {

                console.log(response.data);

                setUsers(response.data);

            });

    }, []);

    return (

        <div>

            <h1>Daftar User</h1>

            {
                users.map((user) => (

                    <div key={user.id}>

                        <h3>{user.nama}</h3>

                        <p>Umur : {user.umur}</p>

                        <hr/>

                    </div>

                ))
            }

        </div>

    );

}

export default App;