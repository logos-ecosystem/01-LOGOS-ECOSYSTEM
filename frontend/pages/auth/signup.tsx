import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useFormik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  acceptTerms: yup.boolean().oneOf([true], 'You must accept the terms and conditions'),
});

const SignUpPage = () => {
  const router = useRouter();
  const { register, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Clear any previous errors
    clearError();
    // Initialize particles
    createParticles();
  }, [clearError]);

  const createParticles = () => {
    const particlesContainer = document.getElementById('authParticles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      particlesContainer.appendChild(particle);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await register(values.name, values.email, values.password);
        router.push('/dashboard');
      } catch (err) {
        console.error('Registration error:', err);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: 'Enter password' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return { strength, label: labels[strength - 1] || 'Weak' };
  };

  const passwordStrength = getPasswordStrength(formik.values.password);

  return (
    <div className="auth-container">
      <div className="particles" id="authParticles"></div>
      
      <div className="auth-box surface">
        <div className="auth-header">
          <div className="logo-icon" style={{ width: '60px', height: '60px', fontSize: '1.5rem', margin: '0 auto' }}>
            AI
          </div>
          <h1>Join the Future</h1>
          <p>Create your account and start your AI journey</p>
        </div>

        <form onSubmit={formik.handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <i className="fas fa-user input-icon"></i>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`form-input ${formik.touched.name && formik.errors.name ? 'error' : ''}`}
              />
            </div>
            {formik.touched.name && formik.errors.name && (
              <div className="error-message">{formik.errors.name}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope input-icon"></i>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`form-input ${formik.touched.email && formik.errors.email ? 'error' : ''}`}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <div className="error-message">{formik.errors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <i className="fas fa-lock input-icon"></i>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`form-input ${formik.touched.password && formik.errors.password ? 'error' : ''}`}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
              </button>
            </div>
            {formik.values.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className={`strength-fill strength-${passwordStrength.strength}`}
                    style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                  />
                </div>
                <span className={`strength-label strength-${passwordStrength.strength}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            {formik.touched.password && formik.errors.password && (
              <div className="error-message">{formik.errors.password}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <i className="fas fa-lock input-icon"></i>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`form-input ${formik.touched.confirmPassword && formik.errors.confirmPassword ? 'error' : ''}`}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
              </button>
            </div>
            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
              <div className="error-message">{formik.errors.confirmPassword}</div>
            )}
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formik.values.acceptTerms}
                onChange={formik.handleChange}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms">
                  <a className="link">Terms of Service</a>
                </Link>
                {' '}and{' '}
                <Link href="/privacy">
                  <a className="link">Privacy Policy</a>
                </Link>
              </span>
            </label>
            {formik.touched.acceptTerms && formik.errors.acceptTerms && (
              <div className="error-message">{formik.errors.acceptTerms}</div>
            )}
          </div>

          <button
            type="submit"
            className="cta-button full-width"
            disabled={isLoading || !formik.isValid}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="social-buttons">
            <button type="button" className="social-button">
              <i className="fab fa-google"></i>
              Continue with Google
            </button>
            <button type="button" className="social-button">
              <i className="fab fa-github"></i>
              Continue with GitHub
            </button>
          </div>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link href="/auth/signin">
                <a className="link">Sign in</a>
              </Link>
            </p>
          </div>
        </form>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .auth-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 50%, rgba(72, 112, 255, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 50%, rgba(0, 246, 255, 0.15) 0%, transparent 50%);
        }

        .auth-box {
          width: 100%;
          max-width: 480px;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 24px;
          position: relative;
          z-index: 1;
          animation: fadeIn 0.6s ease;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .auth-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 1.5rem 0 0.5rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .auth-header p {
          font-size: 1.125rem;
          opacity: 0.7;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          animation: slideIn 0.3s ease;
        }

        .alert-error {
          background: rgba(255, 87, 87, 0.1);
          border: 1px solid rgba(255, 87, 87, 0.3);
          color: #FF5757;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.7;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: rgba(255, 255, 255, 0.5);
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: var(--text-dark);
          font-size: 1rem;
          transition: all 0.3s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 20px rgba(72, 112, 255, 0.15);
        }

        .form-input.error {
          border-color: #FF5757;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: color 0.3s;
        }

        .password-toggle:hover {
          color: var(--primary);
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .strength-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          background: #FF5757;
          transition: all 0.3s;
        }

        .strength-fill.strength-2 {
          background: #FFB547;
        }

        .strength-fill.strength-3 {
          background: #00D4FF;
        }

        .strength-fill.strength-4 {
          background: #47FF88;
        }

        .strength-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #FF5757;
        }

        .strength-label.strength-2 {
          color: #FFB547;
        }

        .strength-label.strength-3 {
          color: #00D4FF;
        }

        .strength-label.strength-4 {
          color: #47FF88;
        }

        .error-message {
          font-size: 0.875rem;
          color: #FF5757;
          margin-top: 0.25rem;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          accent-color: var(--primary);
          flex-shrink: 0;
        }

        .link {
          color: var(--secondary);
          text-decoration: none;
          transition: color 0.3s;
        }

        .link:hover {
          color: var(--primary);
          text-decoration: underline;
        }

        .full-width {
          width: 100%;
          padding: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.5rem;
        }

        .divider {
          position: relative;
          text-align: center;
          margin: 1.5rem 0;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .divider span {
          background: var(--bg-dark);
          padding: 0 1rem;
          position: relative;
          font-size: 0.875rem;
          opacity: 0.5;
        }

        body.light-mode .divider span {
          background: var(--bg-light);
        }

        .social-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .social-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: inherit;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .social-button:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(72, 112, 255, 0.3);
          transform: translateY(-2px);
        }

        .auth-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 480px) {
          .auth-box {
            padding: 2rem 1.5rem;
          }

          .auth-header h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SignUpPage;