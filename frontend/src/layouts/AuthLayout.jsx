import React, { useEffect, useRef } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import LoaderIcon from '../icons/LoaderIcon';
import AuthIllustration from '../components/auth/AuthIllustration';
import AuthHeader from '../components/auth/AuthHeader';
import AuthFooter from '../components/auth/AuthFooter';

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

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'UNKNOWN') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9ff]">
        <LoaderIcon width={40} height={40} color="#2563eb" />
      </div>
    );
  }

  if (status === 'AUTHENTICATED') {
    const from = location.state?.from;
    if (from) {
      return <Navigate to={from} replace />;
    }
    return <Navigate to="/discover" replace />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#f8f9ff] font-[Geist] text-[#0d1c2e]">
      <ShaderBackground />

      <main className="relative z-10 flex h-screen w-full overflow-hidden">
        <AuthIllustration />

        <section className="flex flex-1 flex-col items-center bg-[#eff4ff]/30 px-4 sm:px-6 md:px-10 py-10 sm:py-16 lg:bg-transparent overflow-y-auto min-h-0">
          <div className="my-auto flex w-full max-w-[440px] flex-col justify-center py-2">
            <AuthHeader />

            <Outlet />

            <AuthFooter />
          </div>
        </section>
      </main>
    </div>
  );
}
