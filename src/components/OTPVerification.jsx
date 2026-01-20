import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, Loader2, Mail, Phone, RefreshCw } from 'lucide-react';
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

// Configuration for different verification types
const VERIFICATION_CONFIG = {
  email: {
    icon: Mail,
    title: 'Verify Email Address',
    buttonText: 'Verify Email',
    storagePrefix: 'otp_',
    validateIdentifier: (id) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id),
    errorMessage: 'Please enter a valid email address',
    sendCode: async (identifier, code) => {
      await base44.integrations.Core.SendEmail({
        to: identifier,
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
    },
  },
  phone: {
    icon: Phone,
    title: 'Verify Phone Number',
    buttonText: 'Verify Phone',
    storagePrefix: 'otp_phone_',
    validateIdentifier: (id) => (id || '').replace(/\D/g, '').length >= 10,
    errorMessage: 'Please enter a valid phone number',
    normalizeIdentifier: (id) => (id || '').replace(/\D/g, ''),
    sendCode: async (identifier, code) => {
      try {
        await base44.functions.invoke('sendSMSOTP', { phone: identifier, code });
      } catch (smsError) {
        // SMS failed - code is still stored for verification attempt
        // In production, user should retry or contact support
        toast.error('Failed to send SMS. Please try again.');
      }
    },
  },
};

// Unified OTP Verification Component
function OTPVerification({ 
  type = 'email',
  identifier, 
  onVerified, 
  isVerified = false,
  showBadge = true,
  buttonVariant = "outline",
  buttonSize = "sm"
}) {
  const config = VERIFICATION_CONFIG[type];
  const Icon = config.icon;
  
  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Normalize identifier for storage key
  const normalizedId = config.normalizeIdentifier 
    ? config.normalizeIdentifier(identifier) 
    : identifier;
  const storageKey = `${config.storagePrefix}${normalizedId}`;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCode = async () => {
    if (!config.validateIdentifier(identifier)) {
      toast.error(config.errorMessage);
      return;
    }

    setIsSending(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem(storageKey, JSON.stringify({ code, expires: Date.now() + 600000 }));
      
      await config.sendCode(normalizedId, code);
      
      setCodeSent(true);
      setCountdown(60);
      toast.success(`Verification code sent to ${identifier}`);
    } catch (error) {
      console.error(`Error sending ${type} OTP:`, error);
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
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) {
        toast.error('Verification code expired. Please request a new one.');
        setCodeSent(false);
        return;
      }

      const { code, expires } = JSON.parse(stored);
      if (Date.now() > expires) {
        sessionStorage.removeItem(storageKey);
        toast.error('Verification code expired. Please request a new one.');
        setCodeSent(false);
        return;
      }

      if (otp === code) {
        sessionStorage.removeItem(storageKey);
        toast.success(`${type === 'email' ? 'Email' : 'Phone'} verified successfully!`);
        onVerified?.(identifier);
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
        disabled={!identifier}
        className="gap-1"
      >
        <Icon className="h-3 w-3" />
        {config.buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-blue-600" />
              {config.title}
            </DialogTitle>
            <DialogDescription>
              We'll send a verification code to {identifier}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!codeSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{identifier}</p>
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
                  Enter the 6-digit code sent to your {type}
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

// Convenience wrapper components for backwards compatibility
export function EmailVerification(props) {
  return <OTPVerification type="email" identifier={props.email} {...props} />;
}

export function PhoneVerification(props) {
  return <OTPVerification type="phone" identifier={props.phone} {...props} />;
}

export { OTPVerification };
export default { EmailVerification, PhoneVerification, OTPVerification };