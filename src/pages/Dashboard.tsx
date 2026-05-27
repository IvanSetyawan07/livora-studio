import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    useEffect(() => {
        getUser();
    }, []);

    const getUser = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(
                'http://127.0.0.1:8000/api/user',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setUser(response.data);
        } catch (error) {
            console.log(error);
            alert('Anda harus login terlebih dahulu');
            navigate('/login');
        }
    };
    const logout = async () => {
        const token = localStorage.getItem('token');
        await axios.post(
            'http://127.0.0.1:8000/api/logout',
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        localStorage.removeItem('token');
        navigate('/login');
    };
    return (
        <div style={{ padding: '40px' }}>
            <h1>Dashboard</h1>
            <h2>
                Hello, {user?.name}!
            </h2>
            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}