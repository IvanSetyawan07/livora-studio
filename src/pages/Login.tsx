import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  ArrowRight,
  Check,
} from "lucide-react";

import { api, authStorage } from "@/lib/api";
import loginBg from "@/assets/login-background.png";

export default function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();

    setLoading(true);

    try {

      const { data } = await api.post("/login", {
        email,
        password,
      });

      authStorage.setToken(data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      if (data.user?.role === "admin") {

        navigate("/admin");

      } else {

        navigate("/");

      }

    } catch {

      alert("Email atau password salah");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="relative min-h-screen overflow-hidden bg-[#e9dece]">

      {/* BACKGROUND */}
      <img
        src={loginBg}
        alt="Background"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
          object-center
        "
      />

      {/* OVERLAY */}
      <div
        className="
          absolute
          inset-0
          bg-[rgba(244,232,218,0.30)]
          backdrop-blur-[1px]
        "
      />

      {/* CONTENT */}
      <div
        className="
          relative
          z-20
          flex
          min-h-screen
          items-center
          justify-center
          px-4
          py-8
          sm:px-6
        "
      >

        {/* WRAPPER */}
        <div
          className="
            flex
            w-full
            max-w-[620px]
            flex-col
            items-center
          "
        >

          {/* LOGO */}
          <div className="mb-6 sm:mb-8 text-center">

            <h1
              className="
                text-[34px]
                sm:text-[42px]
                md:text-[56px]
                font-light
                tracking-[0.22em]
                text-[#2f2925]
              "
              style={{
                fontFamily: "serif",
              }}
            >
              LIVORA
            </h1>

            <p
              className="
                mt-1
                text-[9px]
                sm:text-[10px]
                md:text-[11px]
                uppercase
                tracking-[0.30em]
                text-[#75695d]
              "
            >
              Live in comfort, live in style
            </p>

          </div>

          {/* CARD */}
          <form
            onSubmit={handleLogin}
            className="
              w-full
              rounded-[26px]
              sm:rounded-[34px]
              border
              border-white/40
              bg-[rgba(255,248,240,0.38)]
              p-6
              sm:p-8
              md:px-14
              md:py-12
              shadow-[0_20px_60px_rgba(0,0,0,0.08)]
              backdrop-blur-2xl
            "
          >

            {/* TOP TEXT */}
            <div className="mb-8 sm:mb-10">

              <p
                className="
                  mb-2
                  sm:mb-3
                  text-[14px]
                  sm:text-[16px]
                  text-[#c59b74]
                "
              >
                Welcome Back
              </p>

              <h2
                className="
                  text-[34px]
                  sm:text-[44px]
                  md:text-[56px]
                  leading-[1.1]
                  text-[#2f2925]
                "
                style={{
                  fontFamily: "serif",
                  fontWeight: 400,
                }}
              >
                Glad to see you again.
              </h2>

              <p
                className="
                  mt-3
                  sm:mt-4
                  text-[14px]
                  sm:text-[16px]
                  md:text-[18px]
                  leading-relaxed
                  text-[#6e645c]
                "
              >
                Login to continue to your Livora dashboard.
              </p>

            </div>

            {/* EMAIL */}
            <div className="mb-5 sm:mb-7">

              <label
                className="
                  mb-2
                  sm:mb-3
                  block
                  text-[14px]
                  sm:text-[16px]
                  text-[#3e3732]
                "
              >
                Email Address
              </label>

              <div
                className="
                  flex
                  h-[56px]
                  sm:h-[64px]
                  items-center
                  rounded-2xl
                  border
                  border-[#ffffff80]
                  bg-white/70
                  px-4
                  sm:px-5
                "
              >

                <Mail
                  size={20}
                  className="text-[#7a6f66]"
                />

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    ml-3
                    h-full
                    w-full
                    bg-transparent
                    text-[14px]
                    sm:text-[16px]
                    text-[#2f2925]
                    outline-none
                    placeholder:text-[#a39b95]
                  "
                  required
                />

              </div>

            </div>

            {/* PASSWORD */}
            <div className="mb-5 sm:mb-6">

              <label
                className="
                  mb-2
                  sm:mb-3
                  block
                  text-[14px]
                  sm:text-[16px]
                  text-[#3e3732]
                "
              >
                Password
              </label>

              <div
                className="
                  flex
                  h-[56px]
                  sm:h-[64px]
                  items-center
                  rounded-2xl
                  border
                  border-[#ffffff80]
                  bg-white/70
                  px-4
                  sm:px-5
                "
              >

                <Lock
                  size={20}
                  className="text-[#7a6f66]"
                />

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    ml-3
                    h-full
                    w-full
                    bg-transparent
                    text-[14px]
                    sm:text-[16px]
                    text-[#2f2925]
                    outline-none
                    placeholder:text-[#a39b95]
                  "
                  required
                />

                <Eye
                  size={20}
                  className="
                    cursor-pointer
                    text-[#7a6f66]
                  "
                />

              </div>

            </div>

            {/* OPTIONS */}
            <div
              className="
                mb-6
                sm:mb-8
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <label
                className="
                  flex
                  items-center
                  gap-2
                  sm:gap-3
                  text-[13px]
                  sm:text-[15px]
                  text-[#463f3a]
                "
              >

                <div
                  className="
                    flex
                    h-4
                    w-4
                    sm:h-5
                    sm:w-5
                    items-center
                    justify-center
                    rounded-md
                    bg-[#1f1a17]
                  "
                >

                  <Check
                    size={11}
                    className="text-white"
                  />

                </div>

                Remember me

              </label>

              <button
                type="button"
                className="
                  text-[13px]
                  sm:text-[15px]
                  text-[#c59b74]
                  transition
                  hover:underline
                  whitespace-nowrap
                "
              >
                Forgot password?
              </button>

            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="
                group
                flex
                h-[58px]
                sm:h-[68px]
                w-full
                items-center
                justify-center
                rounded-2xl
                bg-[#1b1715]
                text-[14px]
                sm:text-[16px]
                uppercase
                tracking-[0.28em]
                text-white
                transition-all
                duration-300
                hover:bg-[#312a26]
                hover:shadow-2xl
                disabled:opacity-60
              "
            >

              <span>
                {loading ? "Loading..." : "Login"}
              </span>

              <ArrowRight
                size={18}
                className="
                  ml-3
                  sm:ml-5
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />

            </button>

            {/* DIVIDER */}
            <div
              className="
                my-6
                sm:my-8
                flex
                items-center
                gap-3
                sm:gap-4
              "
            >

              <div className="h-px flex-1 bg-[#d8cabb]" />

              <p
                className="
                  whitespace-nowrap
                  text-[13px]
                  sm:text-[15px]
                  text-[#6f645c]
                "
              >
                or continue with
              </p>

              <div className="h-px flex-1 bg-[#d8cabb]" />

            </div>

            {/* GOOGLE BUTTON */}
            <button
              type="button"
              className="
                flex
                h-[58px]
                sm:h-[68px]
                w-full
                items-center
                justify-center
                rounded-2xl
                border
                border-white/60
                bg-white/80
                text-[14px]
                sm:text-[17px]
                text-[#2f2925]
                shadow-sm
                transition
                hover:bg-white
              "
            >

              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="
                  mr-3
                  h-5
                  w-5
                  sm:h-6
                  sm:w-6
                "
              />

              Continue with Google

            </button>

            {/* REGISTER */}
            <p
              className="
                mt-6
                sm:mt-8
                text-center
                text-[13px]
                sm:text-[15px]
                text-[#5f544b]
              "
            >

              Don’t have an account?{" "}

              <Link
                to="/register"
                className="
                  font-medium
                  text-[#c59b74]
                  hover:underline
                "
              >
                Register
              </Link>

            </p>

          </form>

          {/* FOOTER */}
          <p
            className="
              mt-6
              sm:mt-8
              text-center
              text-[11px]
              sm:text-sm
              text-[#a19386]
            "
          >
            © 2024 Livora. All rights reserved.
          </p>

        </div>

      </div>

    </div>

  );

}