import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginCard.css";

import api from "../../services/api";
import userIcon from "../../assets/icons/icon-login.svg";
import eyeOpen from "../../assets/icons/icon-matabuka.svg";
import eyeClose from "../../assets/icons/icon-matatutup.svg";

function LoginCard() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const response = await api.post("/login", {
        employee_number: employeeNumber,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("authUser", JSON.stringify(user));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      if (user.role?.toLowerCase().includes("super")) {
        navigate("/superadmin");
      } else if (user.role?.toLowerCase().includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/employee");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Terjadi kesalahan, silakan ulangi.";
      window.alert(message);
    }
  }

  return (
    <div className="login-card">

      <img
        src={userIcon}
        alt="User"
        className="login-icon"
      />

      <h1 className="login-title">
        LOG IN
      </h1>

      <form className="login-form" onSubmit={handleSubmit}>

        {/* Username */}

        <div className="form-group">
          <label>Username</label>

          <input
            type="text"
            placeholder="Masukkan username"
            value={employeeNumber}
            onChange={(event) => setEmployeeNumber(event.target.value)}
          />
        </div>

        {/* Password */}

        <div className="form-group">
          <label>Password</label>

          <div className="password-wrapper">

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              <img
                src={showPassword ? eyeOpen : eyeClose}
                alt="Toggle Password"
              />
            </button>

          </div>
        </div>

        {/* Button */}

        <button
          type="submit"
          className="login-button"
        >
          LOG IN
        </button>

      </form>

    </div>
  );
}

export default LoginCard;