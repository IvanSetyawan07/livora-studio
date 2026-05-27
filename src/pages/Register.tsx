import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {

  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {

    e.preventDefault();

    try {

      await axios.post(
        'http://127.0.0.1:8000/api/register',
        {
          name,
          email,
          password,
        }
      );

      alert('Register berhasil');

      navigate('/');

    } catch (error) {

      console.log(error);

      alert('Register gagal');

    }
  };

  return (
    <div style={{ padding: '40px' }}>

      <h1>Register</h1>

      <form onSubmit={handleRegister}>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <br /><br />

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
          Register
        </button>

      </form>

    </div>
  );
}