import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginCard.css";

import * as authService from "../../services/authService";
import userIcon from "../../assets/icons/icon-login.svg";
import eyeOpen from "../../assets/icons/icon-matabuka.svg";
import eyeClose from "../../assets/icons/icon-matatutup.svg";

function LoginCard() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const response = await authService.login({
        employeeNumber,
        password,
      });

      const { token, user } = response;
      authService.storeSession({ token, user });

      if (user.role?.toLowerCase().includes("super")) {
        navigate("/superadmin");
      } else if (user.role?.toLowerCase().includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/employee");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Terjadi kesalahan, silakan ulangi.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
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
          <label htmlFor="employee-number">Username</label>

          <input
            type="text"
            id="employee-number"
            name="employee_number"
            autoComplete="username"
            required
            placeholder="Masukkan username"
            value={employeeNumber}
            onChange={(event) => setEmployeeNumber(event.target.value)}
          />
        </div>

        {/* Password */}

        <div className="form-group">
          <label htmlFor="login-password">Password</label>

          <div className="password-wrapper">

            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Masukkan password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
            >
              <img
                src={showPassword ? eyeOpen : eyeClose}
                alt=""
              />
            </button>

          </div>
        </div>

        {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

        {/* Button */}

        <button
          type="submit"
          className="login-button"
          disabled={submitting}
        >
          {submitting ? "MEMPROSES..." : "LOG IN"}
        </button>

      </form>

    </div>
  );
}

export default LoginCard;
