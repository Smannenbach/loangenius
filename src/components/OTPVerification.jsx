import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, Loader2, Mail, Phone, RefreshCw, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// OTP Input Component
function OTPInput({ length = 6, value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const [digits, setDigits] = useState(Array(length).fill(''));

  useEffect(() => {
    const newDigits = (value || '').split('').concat(Array(length).fill('')).slice(0, length);
    setDigits(newDigits);
  }, [value, length]);

  const handleChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    
    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);
    onChange(newDigits.join(''));

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newDigits = pasteData.split('').concat(Array(length).fill('')).slice(0, length);
    setDigits(newDigits);
    onChange(newDigits.join(''));
    
    // Focus last filled input or next empty
    const lastFilledIndex = Math.min(pasteData.length, length) - 1;
    inputRefs.current[lastFilledIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className="w-12 h-12 text-center text-xl font-bold"
        />
      ))}
    </div>
  );
}

// Email Verification Component
export function EmailVerification({ 
  email, 
  onVerified, 
  isVerified = false,
  showBadge = true,
  buttonVariant = "outline",
  buttonSize = "sm"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code temporarily (in production, use backend with expiry)
      sessionStorage.setItem(`otp_${email}`, JSON.stringify({ code, expires: Date.now() + 600000 }));
      
      // Send email via integration
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'LoanGenius - Verify Your Email',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af;">Verify Your Email</h2>
            <p>Your verification code is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `
      });

      setCodeSent(true);
      setCountdown(60);
      toast.success('Verification code sent to your email');
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const stored = sessionStorage.getItem(`otp_${email}`);
      if (!stored) {
        toast.error('Verification code expired. Please request a new one.');
        setCodeSent(false);
        return;
      }

      const { code, expires } = JSON.parse(stored);
      if (Date.now() > expires) {
        sessionStorage.removeItem(`otp_${email}`);
        toast.error('Verification code expired. Please request a new one.');
        setCodeSent(false);
        return;
      }

      if (otp === code) {
        sessionStorage.removeItem(`otp_${email}`);
        toast.success('Email verified successfully!');
        onVerified?.(email);
        setIsOpen(false);
        setOtp('');
        setCodeSent(false);
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified && showBadge) {
    return (
      <Badge className="bg-green-100 text-green-700 gap-1">
        <CheckCircle className="h-3 w-3" />
        Verified
      </Badge>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setIsOpen(true)}
        disabled={!email}
        className="gap-1"
      >
        <Mail className="h-3 w-3" />
        Verify Email
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Verify Email Address
            </DialogTitle>
            <DialogDescription>
              We'll send a verification code to {email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!codeSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{email}</p>
                </div>
                <Button
                  onClick={sendCode}
                  disabled={isSending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center text-gray-600">
                  Enter the 6-digit code sent to your email
                </p>
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isVerifying}
                />
                <Button
                  onClick={verifyCode}
                  disabled={isVerifying || otp.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendCode}
                    disabled={countdown > 0 || isSending}
                    className="text-sm"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Phone Verification Component
export function PhoneVerification({ 
  phone, 
  onVerified, 
  isVerified = false,
  showBadge = true,
  buttonVariant = "outline",
  buttonSize = "sm"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhone = (p) => {
    const cleaned = (p || '').replace(/\D/g, '');
    if (cleaned.length === 10) return `+1${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
    return `+1${cleaned}`;
  };

  const sendCode = async () => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSending(true);
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code temporarily
      sessionStorage.setItem(`otp_phone_${cleanPhone}`, JSON.stringify({ code, expires: Date.now() + 600000 }));
      
      // In production, use Twilio function to send SMS
      // For now, simulate success and show code in toast (dev only)
      console.log('SMS OTP Code:', code);
      
      setCodeSent(true);
      setCountdown(60);
      toast.success(`Verification code sent to ${phone}`);
      // DEV: Show code in toast for testing
      toast.info(`Dev: Your code is ${code}`, { duration: 10000 });
    } catch (error) {
      console.error('Error sending SMS OTP:', error);
      toast.error('Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const cleanPhone = (phone || '').replace(/\D/g, '');
      const stored = sessionStorage.getItem(`otp_phone_${cleanPhone}`);
      if (!stored) {
        toast.error('Verification code expired. Please request a new one.');
        setCodeSent(false);
        return;
      }

      const { code, expires } = JSON.parse(stored);
      if (Date.now() > expires) {
        sessionStorage.removeItem(`otp_phone_${cleanPhone}`);
        toast.error('Verification code expired. Please request a new one.');
        setCodeSent(false);
        return;
      }

      if (otp === code) {
        sessionStorage.removeItem(`otp_phone_${cleanPhone}`);
        toast.success('Phone verified successfully!');
        onVerified?.(phone);
        setIsOpen(false);
        setOtp('');
        setCodeSent(false);
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified && showBadge) {
    return (
      <Badge className="bg-green-100 text-green-700 gap-1">
        <CheckCircle className="h-3 w-3" />
        Verified
      </Badge>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setIsOpen(true)}
        disabled={!phone}
        className="gap-1"
      >
        <Phone className="h-3 w-3" />
        Verify Phone
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Verify Phone Number
            </DialogTitle>
            <DialogDescription>
              We'll send a verification code to {phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!codeSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{phone}</p>
                </div>
                <Button
                  onClick={sendCode}
                  disabled={isSending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center text-gray-600">
                  Enter the 6-digit code sent to your phone
                </p>
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isVerifying}
                />
                <Button
                  onClick={verifyCode}
                  disabled={isVerifying || otp.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendCode}
                    disabled={countdown > 0 || isSending}
                    className="text-sm"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default { EmailVerification, PhoneVerification };