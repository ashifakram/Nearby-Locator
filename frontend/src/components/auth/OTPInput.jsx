import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * OTPInput — 6-digit OTP input with keyboard navigation, paste support, and accessibility.
 */
const OTPInput = forwardRef(({ length = 6, onComplete, disabled = false, autoFocus = true }, ref) => {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      setDigits(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    },
    focus: () => {
      inputRefs.current[0]?.focus();
    },
  }));

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index, value) => {
    if (disabled) return;
    const sanitized = value.replace(/[^0-9]/g, '');
    if (!sanitized) return;

    const newDigits = [...digits];
    newDigits[index] = sanitized[sanitized.length - 1];
    setDigits(newDigits);

    const fullCode = newDigits.join('');
    if (fullCode.length === length && onComplete) {
      onComplete(fullCode);
    } else if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pasteData) return;

    const newDigits = Array(length).fill('');
    for (let i = 0; i < pasteData.length; i++) newDigits[i] = pasteData[i];
    setDigits(newDigits);

    const focusIndex = Math.min(pasteData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (pasteData.length === length && onComplete) onComplete(pasteData);
  };

  return (
    <div
      className="flex justify-between gap-2 sm:gap-3 my-4"
      role="group"
      aria-label={`${length}-digit verification code`}
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${idx + 1} of ${length}`}
          className={`h-14 w-full text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none focus:ring-2
            ${
              digit
                ? 'border-blue-500 bg-blue-50 text-slate-900 shadow-sm ring-0'
                : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
});

OTPInput.displayName = 'OTPInput';

export default OTPInput;
