import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { useToastStore } from '../../store/useToastStore';
import { normalizeError } from '../../utils/errors';
import LoaderIcon from '../../icons/LoaderIcon';
import GoogleLoginButton from '../../components/GoogleLoginButton';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Icon = ({ children, className = '', fill = false }) => (
  <span
    className={`login-material-icon ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
    aria-hidden="true"
  >
    {children}
  </span>
);

function ShaderBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    let frameId;

    const syncSize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    syncSize();
    window.addEventListener('resize', syncSize);

    if (!gl) {
      return () => window.removeEventListener('resize', syncSize);
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      void main() {
        vec2 uv = v_texCoord;
        float noise = sin(uv.x * 2.5 + u_time * 0.2) * cos(uv.y * 2.5 - u_time * 0.1);
        vec3 color1 = vec3(0.972, 0.980, 1.0);
        vec3 color2 = vec3(0.4, 0.42, 0.95);
        vec3 finalColor = mix(color1, color2, clamp(noise * 0.06, 0.0, 1.0));
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');

    const render = (time) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, time * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', syncSize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full pointer-events-none" />;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToastStore();

  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/discover';
  const registered = location.state?.registered;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setUnverifiedEmail('');
    try {
      await authService.login(data.email, data.password);
      showToast('Logged in successfully!', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      const errorDetail = err.response?.data?.error || {};
      if (errorDetail.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email);
      }
      showToast(normalizeError(err), 'error');
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await authService.resendVerification(unverifiedEmail);
      showToast('Verification email resent! Please check your inbox.', 'success');
      setUnverifiedEmail('');
    } catch (err) {
      showToast(normalizeError(err), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[#f8f9ff] font-[Geist] text-[#0d1c2e]">
      <ShaderBackground />

      <main className="relative z-10 flex h-screen w-full overflow-hidden">
        <section className="hidden flex-1 flex-col justify-between px-10 py-12 lg:flex">
          <div className="max-w-xl">
            <div className="login-fade-up mb-6 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon className="text-[28px] text-[#4648d4]" fill>location_on</Icon>
                <span className="text-2xl font-bold tracking-normal text-[#0d1c2e]">Nearby Locator</span>
              </div>
              <div className="h-5 w-px bg-[#c7c4d7]/60" />
              <div className="login-brand-badge">
                <div className="relative z-10 flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5">
                  <Icon className="text-sm text-[#4648d4]" fill>auto_awesome</Icon>
                  <span className="text-[10px] font-bold tracking-normal text-[#464554]">POWERED BY GEMINI AI</span>
                </div>
              </div>
            </div>

            <h1 className="login-fade-up mb-4 text-[48px] font-bold leading-[1.1] tracking-normal text-[#0d1c2e] [animation-delay:0.1s]">
              Discover Better <br />
              <span className="italic text-[#4648d4]">Places</span> with AI
            </h1>

            <p className="login-fade-up mb-6 max-w-md text-base leading-relaxed tracking-normal text-[#464554] [animation-delay:0.2s]">
              Find restaurants, hospitals, and local gems with intelligent summaries and contextual insights.
            </p>

            <div className="login-fade-up mb-12 flex flex-wrap gap-2 [animation-delay:0.3s]">
              {[
                ['insights', 'AI Insights'],
                ['star_half', 'Smart Recs'],
                ['description', 'Summaries'],
              ].map(([icon, label]) => (
                <div key={label} className="login-chip flex items-center gap-2 rounded-full px-3 py-1.5">
                  <Icon className="text-lg text-[#4648d4]">{icon}</Icon>
                  <span className="text-sm font-medium tracking-normal text-[#0d1c2e]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="login-fade-up relative w-full max-w-lg self-start [animation-delay:0.4s]">
            <div className="absolute -right-6 -top-6 z-20 flex animate-bounce items-center gap-3 rounded-2xl border border-[#4648d4]/15 bg-white/90 p-3 shadow-[0_10px_30px_-10px_rgba(70,72,212,0.2)] backdrop-blur-md">
              <Icon className="text-sm text-[#4648d4]">search</Icon>
              <p className="text-[11px] font-medium tracking-normal text-[#0d1c2e]">
                "Find the best quiet cafe for working nearby..."
              </p>
            </div>
            <div className="absolute inset-0 scale-110 rounded-full bg-[#4648d4]/5 blur-[100px]" />
            <img
              src="/auth-login-illustration.png"
              alt="Nearby Locator Illustration"
              className="login-floating relative z-10 h-auto max-h-[45vh] w-full object-contain"
            />
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center bg-[#eff4ff]/30 px-4 py-8 md:px-10 lg:bg-transparent">
          <div className="flex h-full w-full max-w-[420px] flex-col justify-center lg:h-auto">
            <div className="login-fade-up mb-8 flex flex-col items-center lg:hidden">
              <div className="mb-3 flex items-center gap-2">
                <Icon className="text-[32px] text-[#4648d4]" fill>location_on</Icon>
                <span className="text-2xl font-bold tracking-normal text-[#0d1c2e]">Nearby Locator</span>
              </div>
              <div className="login-brand-badge">
                <div className="relative z-10 flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5">
                  <Icon className="text-xs text-[#4648d4]" fill>auto_awesome</Icon>
                  <span className="text-[9px] font-bold tracking-normal text-[#464554]">POWERED BY GEMINI AI</span>
                </div>
              </div>
            </div>

            <div className="login-glass-panel login-fade-up rounded-[32px] p-6 [animation-delay:0.2s] md:p-8">
              <div className="mb-6 text-center">
                <h2 className="mb-1 text-2xl font-semibold tracking-normal text-[#0d1c2e]">Welcome Back</h2>
                <p className="text-sm tracking-normal text-[#464554]">Sign in to explore your city with AI.</p>
              </div>

              {registered && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium tracking-normal text-emerald-700">
                  Account created. Check your email to verify before logging in.
                </div>
              )}

              {unverifiedEmail && (
                <div className="mb-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm font-medium tracking-normal text-amber-800">
                  <p>Your account is not verified yet.</p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="text-xs font-bold tracking-normal text-[#4648d4] hover:underline disabled:opacity-50"
                  >
                    {resending ? 'Resending...' : 'Resend Verification Email'}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <div className={`group relative rounded-xl border bg-white/50 transition-all duration-300 focus-within:border-[#4648d4] focus-within:shadow-[0_0_0_4px_rgba(70,72,212,0.1)] ${errors.email ? 'border-[#ba1a1a]/60' : 'border-[#c7c4d7]/60'}`}>
                    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#464554] transition-colors group-focus-within:text-[#4648d4]">
                      mail
                    </Icon>
                    <input
                      id="email"
                      type="email"
                      placeholder=" "
                      disabled={isSubmitting}
                      {...register('email')}
                      className="peer h-[52px] w-full rounded-xl border-none bg-transparent pl-12 pr-4 pt-3 text-base tracking-normal text-[#0d1c2e] outline-none placeholder-transparent focus:ring-0 disabled:opacity-60"
                    />
                    <label
                      htmlFor="email"
                      className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-sm font-medium tracking-normal text-[#464554] transition-all duration-200 peer-focus:top-3 peer-focus:text-[10px] peer-focus:text-[#4648d4] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[10px]"
                    >
                      Email address
                    </label>
                  </div>
                  {errors.email && <p className="mt-1 px-2 text-xs font-semibold tracking-normal text-[#ba1a1a]">{errors.email.message}</p>}
                </div>

                <div>
                  <div className={`group relative rounded-xl border bg-white/50 transition-all duration-300 focus-within:border-[#4648d4] focus-within:shadow-[0_0_0_4px_rgba(70,72,212,0.1)] ${errors.password ? 'border-[#ba1a1a]/60' : 'border-[#c7c4d7]/60'}`}>
                    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#464554] transition-colors group-focus-within:text-[#4648d4]">
                      lock
                    </Icon>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder=" "
                      disabled={isSubmitting}
                      {...register('password')}
                      className="peer h-[52px] w-full rounded-xl border-none bg-transparent pl-12 pr-12 pt-3 text-base tracking-normal text-[#0d1c2e] outline-none placeholder-transparent focus:ring-0 disabled:opacity-60"
                    />
                    <label
                      htmlFor="password"
                      className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-sm font-medium tracking-normal text-[#464554] transition-all duration-200 peer-focus:top-3 peer-focus:text-[10px] peer-focus:text-[#4648d4] peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[10px]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#464554] transition-colors hover:text-[#4648d4]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Icon className="text-xl">{showPassword ? 'visibility_off' : 'visibility'}</Icon>
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <div>{errors.password && <p className="px-2 text-xs font-semibold tracking-normal text-[#ba1a1a]">{errors.password.message}</p>}</div>
                    <Link to="/forgot-password" className="shrink-0 text-xs font-medium tracking-normal text-[#4648d4] transition-colors hover:text-[#6063ee]">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="login-gradient-button group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-sm font-bold tracking-normal text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderIcon width={20} height={20} color="white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <Icon className="text-xl transition-transform group-hover:translate-x-1">arrow_forward</Icon>
                    </>
                  )}
                </button>

                <div className="flex items-center py-1">
                  <div className="h-px flex-1 bg-[#c7c4d7]/40" />
                  <span className="mx-4 text-[10px] font-bold uppercase tracking-normal text-[#464554]">or</span>
                  <div className="h-px flex-1 bg-[#c7c4d7]/40" />
                </div>

                <div className="rounded-xl border border-[#c7c4d7]/60 bg-white px-3 py-2 shadow-sm">
                  <GoogleLoginButton theme="outline" shape="rectangular" text="signin_with" height={36} colorScheme="light" />
                </div>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-[#464554]">
                <Icon className="text-sm text-[#4648d4]" fill>verified_user</Icon>
                <p className="text-[11px] font-semibold tracking-normal">Your data stays private and secure.</p>
              </div>

            </div>

            <div className="mt-6 text-center">
              <p className="text-xs tracking-normal text-[#464554]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="font-bold tracking-normal text-[#4648d4] hover:underline"
                >
                  Create Account
                </button>
              </p>
            </div>

            <div className="login-fade-up mt-auto pb-4 text-center [animation-delay:0.4s] lg:mt-6">
              <div className="mb-2 flex justify-center gap-6">
                {['Privacy', 'Terms', 'Support'].map((item) => (
                  <a key={item} href="/" className="text-[10px] font-semibold tracking-normal text-[#464554]/70 transition-colors hover:text-[#4648d4]">
                    {item}
                  </a>
                ))}
              </div>
              <p className="text-[10px] font-semibold tracking-normal text-[#464554]/50">Premium local discovery with AI.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
