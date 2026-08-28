import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', nationality: '', idNumber: '',
    emergencyContact: { name: '', phone: '' },
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateEmergency(field, value) {
    setForm((f) => ({ ...f, emergencyContact: { ...f.emergencyContact, [field]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <div className="auth-card">
      <h2>Create your Digital Tourist ID</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Full name" onChange={(e) => update('name', e.target.value)} required />
        <input placeholder="Email" type="email" onChange={(e) => update('email', e.target.value)} required />
        <input placeholder="Password" type="password" onChange={(e) => update('password', e.target.value)} required />
        <input placeholder="Phone" onChange={(e) => update('phone', e.target.value)} required />
        <input placeholder="Nationality" onChange={(e) => update('nationality', e.target.value)} required />
        <input placeholder="Passport / National ID number" onChange={(e) => update('idNumber', e.target.value)} required />
        <hr />
        <input placeholder="Emergency contact name" onChange={(e) => updateEmergency('name', e.target.value)} />
        <input placeholder="Emergency contact phone" onChange={(e) => updateEmergency('phone', e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
