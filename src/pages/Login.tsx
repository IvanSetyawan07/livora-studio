import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {

    e.preventDefault();

    try {

      const response = await axios.post(
        'http://127.0.0.1:8000/api/login',
        {
          email,
          password,
        }
      );

      localStorage.setItem('token', response.data.token);

      alert('Login berhasil');

      navigate('/dashboard');

    } catch (error) {

      alert('Email atau password salah');

    }
  };

  return (
    <div style={{ padding: '40px' }}>

      <h1>Login</h1>

      <form onSubmit={handleLogin}>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button type="submit">
          Login
        </button>

      </form>

    </div>
  );
}