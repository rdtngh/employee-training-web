import { useState } from "react";
import "./LoginCard.css";

import userIcon from "../../assets/icons/icon-login.svg";
import eyeOpen from "../../assets/icons/icon-matabuka.svg";
import eyeClose from "../../assets/icons/icon-matatutup.svg";

function LoginCard() {
  const [showPassword, setShowPassword] = useState(false);

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

      <form className="login-form">

        {/* Username */}

        <div className="form-group">
          <label>Username</label>

          <input
            type="text"
            placeholder="Masukkan username"
          />
        </div>

        {/* Password */}

        <div className="form-group">
          <label>Password</label>

          <div className="password-wrapper">

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
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