import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/router';
import CheckoutForm from '@/pages/dashboard/subscription/checkout';
import { subscriptionAPI } from '@/services/api/subscription';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
  }),
}));

jest.mock('@/services/api/subscription', () => ({
  subscriptionAPI: {
    createPaymentIntent: jest.fn(),
    createSubscription: jest.fn(),
  },
}));

// Mock Stripe
const mockStripe = {
  confirmCardPayment: jest.fn(),
  confirmAchPayment: jest.fn(),
};

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve(mockStripe)),
}));

const mockElements = {
  getElement: jest.fn(() => ({
    focus: jest.fn(),
    clear: jest.fn(),
  })),
};

jest.mock('@stripe/react-stripe-js', () => ({
  ...jest.requireActual('@stripe/react-stripe-js'),
  Elements: ({ children }: any) => children,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <Elements stripe={null}>
        {component}
      </Elements>
    </QueryClientProvider>
  );
};

describe('CheckoutForm', () => {
  const mockPush = jest.fn();
  const mockQuery = { planId: 'price_professional' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: mockQuery,
    });
  });

  describe('Plan Selection', () => {
    it('should display the selected plan details', () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('$99.00')).toBeInTheDocument();
    });

    it('should allow switching between monthly and yearly billing', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      const yearlyOption = screen.getByLabelText(/Facturación Anual/);
      await userEvent.click(yearlyOption);
      
      // Should show discounted price
      expect(screen.getByText(/Ahorra 20%/)).toBeInTheDocument();
    });

    it('should validate and apply promo codes', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      const promoInput = screen.getByPlaceholderText('Ingresa tu código');
      const applyButton = screen.getByText('Aplicar');
      
      await userEvent.type(promoInput, 'WELCOME20');
      await userEvent.click(applyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/20% de descuento/)).toBeInTheDocument();
      });
    });

    it('should show error for invalid promo code', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      const promoInput = screen.getByPlaceholderText('Ingresa tu código');
      const applyButton = screen.getByText('Aplicar');
      
      await userEvent.type(promoInput, 'INVALID');
      await userEvent.click(applyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Código promocional inválido')).toBeInTheDocument();
      });
    });
  });

  describe('Billing Information', () => {
    it('should validate required fields', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Go to billing information step
      const continueButton = screen.getByText('Continuar');
      await userEvent.click(continueButton);
      
      // Try to continue without filling required fields
      await userEvent.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText(/El campo name es requerido/)).toBeInTheDocument();
      });
    });

    it('should allow toggling company billing', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Go to billing information step
      await userEvent.click(screen.getByText('Continuar'));
      
      const companyToggle = screen.getByLabelText('Facturar a nombre de empresa');
      await userEvent.click(companyToggle);
      
      expect(screen.getByLabelText('Nombre de la Empresa')).toBeInTheDocument();
      expect(screen.getByLabelText('ID Fiscal / NIF')).toBeInTheDocument();
    });

    it('should fill and validate billing form', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Go to billing information step
      await userEvent.click(screen.getByText('Continuar'));
      
      // Fill form
      await userEvent.type(screen.getByLabelText('Nombre Completo'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Teléfono'), '+1234567890');
      await userEvent.type(screen.getByLabelText('Dirección Línea 1'), '123 Main St');
      await userEvent.type(screen.getByLabelText('Ciudad'), 'New York');
      await userEvent.type(screen.getByLabelText('Estado/Provincia'), 'NY');
      await userEvent.type(screen.getByLabelText('Código Postal'), '10001');
      
      // Continue to next step
      await userEvent.click(screen.getByText('Continuar'));
      
      // Should move to payment method step
      await waitFor(() => {
        expect(screen.getByText('Método de Pago')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Methods', () => {
    beforeEach(async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Go through steps to payment method
      await userEvent.click(screen.getByText('Continuar'));
      
      // Fill billing info
      await userEvent.type(screen.getByLabelText('Nombre Completo'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Teléfono'), '+1234567890');
      await userEvent.type(screen.getByLabelText('Dirección Línea 1'), '123 Main St');
      await userEvent.type(screen.getByLabelText('Ciudad'), 'New York');
      await userEvent.type(screen.getByLabelText('Estado/Provincia'), 'NY');
      await userEvent.type(screen.getByLabelText('Código Postal'), '10001');
      
      await userEvent.click(screen.getByText('Continuar'));
    });

    it('should display all payment method options', async () => {
      expect(screen.getByText('Tarjeta de Crédito/Débito')).toBeInTheDocument();
      expect(screen.getByText('Transferencia Bancaria')).toBeInTheDocument();
      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('Criptomonedas')).toBeInTheDocument();
    });

    it('should select credit card payment method', async () => {
      const cardOption = screen.getByText('Tarjeta de Crédito/Débito').closest('div[role="button"]');
      await userEvent.click(cardOption!);
      
      expect(screen.getByTestId('card-element')).toBeInTheDocument();
    });

    it('should show crypto discount', async () => {
      const cryptoOption = screen.getByText('Criptomonedas').closest('div[role="button"]');
      await userEvent.click(cryptoOption!);
      
      expect(screen.getByText('¡5% de descuento adicional por pagar con crypto!')).toBeInTheDocument();
    });
  });

  describe('Order Review and Submission', () => {
    beforeEach(async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Complete all steps
      await userEvent.click(screen.getByText('Continuar'));
      
      // Fill billing info
      await userEvent.type(screen.getByLabelText('Nombre Completo'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Teléfono'), '+1234567890');
      await userEvent.type(screen.getByLabelText('Dirección Línea 1'), '123 Main St');
      await userEvent.type(screen.getByLabelText('Ciudad'), 'New York');
      await userEvent.type(screen.getByLabelText('Estado/Provincia'), 'NY');
      await userEvent.type(screen.getByLabelText('Código Postal'), '10001');
      
      await userEvent.click(screen.getByText('Continuar'));
      
      // Select payment method
      const cardOption = screen.getByText('Tarjeta de Crédito/Débito').closest('div[role="button"]');
      await userEvent.click(cardOption!);
      
      await userEvent.click(screen.getByText('Continuar'));
    });

    it('should display order summary', async () => {
      expect(screen.getByText('Plan Seleccionado')).toBeInTheDocument();
      expect(screen.getByText('Información de Facturación')).toBeInTheDocument();
      expect(screen.getByText('Método de Pago')).toBeInTheDocument();
    });

    it('should require accepting terms', async () => {
      const payButton = screen.getByRole('button', { name: /Pagar/ });
      await userEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Debes aceptar los términos y condiciones')).toBeInTheDocument();
      });
    });

    it('should process payment successfully', async () => {
      // Mock successful payment
      (subscriptionAPI.createPaymentIntent as jest.Mock).mockResolvedValue({
        data: { clientSecret: 'test_client_secret' },
      });
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: { payment_method: 'pm_test123' },
      });
      
      (subscriptionAPI.createSubscription as jest.Mock).mockResolvedValue({
        data: { id: 'sub_123' },
      });
      
      // Accept terms
      const termsCheckbox = screen.getByRole('checkbox', { name: /Acepto los/ });
      await userEvent.click(termsCheckbox);
      
      // Submit payment
      const payButton = screen.getByRole('button', { name: /Pagar/ });
      await userEvent.click(payButton);
      
      await waitFor(() => {
        expect(subscriptionAPI.createPaymentIntent).toHaveBeenCalled();
        expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
          'test_client_secret',
          expect.any(Object)
        );
        expect(subscriptionAPI.createSubscription).toHaveBeenCalled();
      });
      
      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('¡Pago Exitoso!')).toBeInTheDocument();
      });
      
      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard?welcome=true');
      }, { timeout: 5000 });
    });

    it('should handle payment errors', async () => {
      // Mock payment error
      (subscriptionAPI.createPaymentIntent as jest.Mock).mockResolvedValue({
        data: { clientSecret: 'test_client_secret' },
      });
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        error: { message: 'Your card was declined' },
      });
      
      // Accept terms
      const termsCheckbox = screen.getByRole('checkbox', { name: /Acepto los/ });
      await userEvent.click(termsCheckbox);
      
      // Submit payment
      const payButton = screen.getByRole('button', { name: /Pagar/ });
      await userEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Your card was declined')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate between steps', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Go to step 2
      await userEvent.click(screen.getByText('Continuar'));
      expect(screen.getByText('Información de Facturación')).toBeInTheDocument();
      
      // Go back to step 1
      await userEvent.click(screen.getByText('Atrás'));
      expect(screen.getByText('Confirma tu Plan')).toBeInTheDocument();
    });

    it('should disable back button on first step', () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      const backButton = screen.getByText('Atrás');
      expect(backButton).toBeDisabled();
    });
  });

  describe('Price Calculations', () => {
    it('should calculate totals correctly', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Apply promo code
      const promoInput = screen.getByPlaceholderText('Ingresa tu código');
      await userEvent.type(promoInput, 'WELCOME20');
      await userEvent.click(screen.getByText('Aplicar'));
      
      await waitFor(() => {
        // Original price: $99
        // With 20% discount: $79.20
        expect(screen.getByText('$79.20')).toBeInTheDocument();
      });
    });

    it('should show tax calculations', async () => {
      renderWithProviders(<CheckoutForm planId="price_professional" />);
      
      // Go through to review step
      await userEvent.click(screen.getByText('Continuar'));
      
      // Fill billing info (NY has 8% tax)
      await userEvent.type(screen.getByLabelText('Nombre Completo'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Teléfono'), '+1234567890');
      await userEvent.type(screen.getByLabelText('Dirección Línea 1'), '123 Main St');
      await userEvent.type(screen.getByLabelText('Ciudad'), 'New York');
      await userEvent.type(screen.getByLabelText('Estado/Provincia'), 'NY');
      await userEvent.type(screen.getByLabelText('Código Postal'), '10001');
      
      await userEvent.click(screen.getByText('Continuar'));
      await userEvent.click(screen.getByText('Continuar'));
      
      // Should show tax amount
      expect(screen.getByText('Impuestos')).toBeInTheDocument();
    });
  });
});