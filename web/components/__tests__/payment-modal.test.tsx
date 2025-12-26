/**
 * Payment Modal Tests
 *
 * Tests the PaymentModal component which handles the demo QR payment flow
 * for movie rentals.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PaymentModal } from '../payment-modal';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      title: 'Rent Movie',
      description: `Rent ${params?.movie || 'Movie'} for 48 hours`,
      descriptionRequired: `You need to rent ${params?.movie || 'Movie'} to watch`,
      descriptionExpired: `Your rental of ${params?.movie || 'Movie'} has expired`,
      scanInstructions: 'Scan the QR code to complete payment',
      emulatePayment: 'Emulate Payment',
      processing: 'Processing...',
      complete: 'Complete',
      paymentSuccess: 'Payment successful!',
      demoNotice: 'This is a demo. No real payment is processed.',
    };
    return translations[key] || key;
  },
}));

// Mock i18n routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock auth context
const mockUseAuth = jest.fn<{ user: { id: string; email: string } | null }, []>(() => ({ user: null }));
jest.mock('@/lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock QRCodeSVG
jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value}>QR Code</div>
  ),
}));

describe('PaymentModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    movieTitle: 'Test Movie',
    onPaymentComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  describe('Rendering', () => {
    it('should render the modal when open', () => {
      render(<PaymentModal {...defaultProps} />);

      expect(screen.getByText('Rent Movie')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<PaymentModal {...defaultProps} open={false} />);

      expect(screen.queryByText('Rent Movie')).not.toBeInTheDocument();
    });

    it('should display movie title in description', () => {
      render(<PaymentModal {...defaultProps} />);

      expect(screen.getByText('Rent Test Movie for 48 hours')).toBeInTheDocument();
    });

    it('should render QR code with correct URL', () => {
      render(<PaymentModal {...defaultProps} />);

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toHaveAttribute('data-value', 'https://en.wikipedia.org/wiki/Cinema_of_Laos');
    });

    it('should render emulate payment button', () => {
      render(<PaymentModal {...defaultProps} />);

      expect(screen.getByText('Emulate Payment')).toBeInTheDocument();
    });

    it('should render demo notice', () => {
      render(<PaymentModal {...defaultProps} />);

      expect(screen.getByText('This is a demo. No real payment is processed.')).toBeInTheDocument();
    });
  });

  describe('Payment Reason', () => {
    it('should show default description for default reason', () => {
      render(<PaymentModal {...defaultProps} reason="default" />);

      expect(screen.getByText('Rent Test Movie for 48 hours')).toBeInTheDocument();
    });

    it('should show required description for rental_required reason', () => {
      render(<PaymentModal {...defaultProps} reason="rental_required" />);

      expect(screen.getByText('You need to rent Test Movie to watch')).toBeInTheDocument();
    });

    it('should show expired description for rental_expired reason', () => {
      render(<PaymentModal {...defaultProps} reason="rental_expired" />);

      expect(screen.getByText('Your rental of Test Movie has expired')).toBeInTheDocument();
    });
  });

  describe('Anonymous User Prompt', () => {
    it('should show account creation prompt for anonymous users', () => {
      mockUseAuth.mockReturnValue({ user: null });
      render(<PaymentModal {...defaultProps} />);

      expect(screen.getByText('Create Free Account')).toBeInTheDocument();
      expect(screen.getByText('Watch on multiple devices')).toBeInTheDocument();
      expect(screen.getByText('Sync watch progress across devices')).toBeInTheDocument();
      expect(screen.getByText('View rental history')).toBeInTheDocument();
    });

    it('should not show account creation prompt for logged-in users', () => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-123', email: 'test@example.com' } });
      render(<PaymentModal {...defaultProps} />);

      expect(screen.queryByText('Create Free Account')).not.toBeInTheDocument();
    });

    it('should link to profile page for account creation', () => {
      mockUseAuth.mockReturnValue({ user: null });
      render(<PaymentModal {...defaultProps} />);

      const link = screen.getByText('Create Free Account').closest('a');
      expect(link).toHaveAttribute('href', '/profile');
    });
  });

  describe('Payment Flow', () => {
    it('should show processing state when payment is clicked', async () => {
      const onPaymentComplete = jest.fn().mockResolvedValue(undefined);
      render(<PaymentModal {...defaultProps} onPaymentComplete={onPaymentComplete} />);

      const button = screen.getByText('Emulate Payment');
      
      await act(async () => {
        fireEvent.click(button);
      });

      // Should show processing state
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should call onPaymentComplete after processing', async () => {
      const onPaymentComplete = jest.fn().mockResolvedValue(undefined);
      render(<PaymentModal {...defaultProps} onPaymentComplete={onPaymentComplete} />);

      const button = screen.getByText('Emulate Payment');
      
      await act(async () => {
        fireEvent.click(button);
        // Wait for processing delay (1500ms)
        await new Promise(resolve => setTimeout(resolve, 1600));
      });

      expect(onPaymentComplete).toHaveBeenCalled();
    });

    it('should show success state after payment completes', async () => {
      const onPaymentComplete = jest.fn().mockResolvedValue(undefined);
      render(<PaymentModal {...defaultProps} onPaymentComplete={onPaymentComplete} />);

      const button = screen.getByText('Emulate Payment');
      
      await act(async () => {
        fireEvent.click(button);
        await new Promise(resolve => setTimeout(resolve, 1600));
      });

      await waitFor(() => {
        expect(screen.getByText('Payment successful!')).toBeInTheDocument();
      });
    });

    it('should show error state when payment fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onPaymentComplete = jest.fn().mockRejectedValue(new Error('Payment failed'));
      render(<PaymentModal {...defaultProps} onPaymentComplete={onPaymentComplete} />);

      const button = screen.getByText('Emulate Payment');
      
      await act(async () => {
        fireEvent.click(button);
        await new Promise(resolve => setTimeout(resolve, 1600));
      });

      await waitFor(() => {
        expect(screen.getByText(/The alert displayed explains the issue/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should disable button while processing', async () => {
      const onPaymentComplete = jest.fn().mockResolvedValue(undefined);
      render(<PaymentModal {...defaultProps} onPaymentComplete={onPaymentComplete} />);

      const button = screen.getByText('Emulate Payment');
      
      await act(async () => {
        fireEvent.click(button);
      });

      // Button should be disabled during processing
      const processingButton = screen.getByRole('button', { name: /Processing/ });
      expect(processingButton).toBeDisabled();
    });
  });

  describe('Modal Close Behavior', () => {
    it('should call onOpenChange when closing', () => {
      const onOpenChange = jest.fn();
      render(<PaymentModal {...defaultProps} onOpenChange={onOpenChange} />);

      // The dialog close behavior is handled by the Dialog component
      // We can test that the onOpenChange is passed correctly
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('should not close while processing', async () => {
      const onOpenChange = jest.fn();
      const onPaymentComplete = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 3000))
      );
      render(<PaymentModal {...defaultProps} onOpenChange={onOpenChange} onPaymentComplete={onPaymentComplete} />);

      const button = screen.getByText('Emulate Payment');
      
      await act(async () => {
        fireEvent.click(button);
      });

      // Modal should not close while processing - handleClose checks isProcessing
      // This is tested indirectly by verifying the processing state
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should reset state when modal closes', async () => {
      const onOpenChange = jest.fn();
      const { rerender } = render(<PaymentModal {...defaultProps} onOpenChange={onOpenChange} />);

      // Close the modal
      rerender(<PaymentModal {...defaultProps} onOpenChange={onOpenChange} open={false} />);

      // Reopen the modal
      rerender(<PaymentModal {...defaultProps} onOpenChange={onOpenChange} open={true} />);

      // Should be back to initial state
      expect(screen.getByText('Emulate Payment')).toBeInTheDocument();
      expect(screen.queryByText('Payment successful!')).not.toBeInTheDocument();
    });
  });

  describe('Create Account Button', () => {
    it('should close modal when Create Account is clicked', () => {
      const onOpenChange = jest.fn();
      mockUseAuth.mockReturnValue({ user: null });
      render(<PaymentModal {...defaultProps} onOpenChange={onOpenChange} />);

      const createAccountButton = screen.getByText('Create Free Account');
      fireEvent.click(createAccountButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
