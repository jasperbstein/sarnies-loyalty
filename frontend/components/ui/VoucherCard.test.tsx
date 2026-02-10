import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoucherCard, type VoucherCardProps } from './VoucherCard';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

describe('VoucherCard', () => {
  const defaultProps: VoucherCardProps = {
    id: 1,
    title: 'Free Coffee',
    description: 'Get a free coffee on us',
    voucherType: 'free_item',
    pointsRequired: 100,
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('rendering', () => {
    it('renders title and description', () => {
      render(<VoucherCard {...defaultProps} />);
      expect(screen.getByText('Free Coffee')).toBeInTheDocument();
      expect(screen.getByText('Get a free coffee on us')).toBeInTheDocument();
    });

    it('renders points required', () => {
      render(<VoucherCard {...defaultProps} pointsRequired={150} />);
      expect(screen.getByText('150 pts')).toBeInTheDocument();
    });

    it('renders FREE when points is 0', () => {
      render(<VoucherCard {...defaultProps} pointsRequired={0} />);
      expect(screen.getByText('FREE')).toBeInTheDocument();
    });

    it('renders PERK label for employee perks', () => {
      render(<VoucherCard {...defaultProps} isEmployee={true} pointsRequired={100} />);
      expect(screen.getByText('PERK')).toBeInTheDocument();
    });
  });

  describe('fallback images based on voucher type', () => {
    it('uses coffee image for coffee items', () => {
      render(<VoucherCard {...defaultProps} title="Free Coffee" voucherType="free_item" imageUrl={undefined} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/content/vouchers/coffee.jpg');
    });

    it('uses pastry image for birthday items', () => {
      render(<VoucherCard {...defaultProps} title="Birthday Cake" voucherType="free_item" imageUrl={undefined} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/content/vouchers/pastry.jpg');
    });

    it('uses coffee-beans image for discounts', () => {
      render(<VoucherCard {...defaultProps} voucherType="discount_amount" imageUrl={undefined} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/content/vouchers/coffee-beans.jpg');
    });

    it('uses merch image for merch type', () => {
      render(<VoucherCard {...defaultProps} voucherType="merch" imageUrl={undefined} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/content/vouchers/merch.jpg');
    });

    it('uses bakery image for generic free items', () => {
      render(<VoucherCard {...defaultProps} title="Mystery Gift" voucherType="free_item" imageUrl={undefined} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/content/vouchers/bakery.jpg');
    });
  });

  describe('featured badge', () => {
    it('shows Featured badge when isFeatured is true', () => {
      render(<VoucherCard {...defaultProps} isFeatured={true} />);
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('does not show Featured badge by default', () => {
      render(<VoucherCard {...defaultProps} />);
      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });
  });

  describe('remaining count', () => {
    it('shows remaining count when maxPerDay and remainingToday are provided', () => {
      render(<VoucherCard {...defaultProps} maxPerDay={3} remainingToday={2} />);
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    it('does not show remaining count without maxPerDay', () => {
      render(<VoucherCard {...defaultProps} remainingToday={2} />);
      expect(screen.queryByText(/left/)).not.toBeInTheDocument();
    });
  });

  describe('click behavior', () => {
    it('navigates to voucher detail page on click', () => {
      render(<VoucherCard {...defaultProps} id={42} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockPush).toHaveBeenCalledWith('/app/vouchers/42');
    });

    it('calls custom onClick when provided', () => {
      const handleClick = vi.fn();
      render(<VoucherCard {...defaultProps} onClick={handleClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    describe('grid variant (default)', () => {
      it('renders as button', () => {
        render(<VoucherCard {...defaultProps} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      it('applies card styles', () => {
        render(<VoucherCard {...defaultProps} />);
        const button = screen.getByRole('button');
        // Uses .card CSS class from design system instead of inline Tailwind
        expect(button.className).toContain('card');
      });
    });

    describe('featured variant', () => {
      it('renders Use Now button when onUseNow provided', () => {
        const handleUseNow = vi.fn();
        render(<VoucherCard {...defaultProps} variant="featured" onUseNow={handleUseNow} />);

        const useNowButton = screen.getByRole('button', { name: 'Use Now' });
        expect(useNowButton).toBeInTheDocument();

        fireEvent.click(useNowButton);
        expect(handleUseNow).toHaveBeenCalledTimes(1);
      });

      it('does not render Use Now button without onUseNow', () => {
        render(<VoucherCard {...defaultProps} variant="featured" />);
        expect(screen.queryByRole('button', { name: 'Use Now' })).not.toBeInTheDocument();
      });
    });

    describe('list variant', () => {
      it('renders in horizontal layout', () => {
        render(<VoucherCard {...defaultProps} variant="list" />);
        const button = screen.getByRole('button');
        expect(button.className).toContain('flex');
      });

      it('navigates on click', () => {
        render(<VoucherCard {...defaultProps} variant="list" id={99} />);

        fireEvent.click(screen.getByRole('button'));

        expect(mockPush).toHaveBeenCalledWith('/app/vouchers/99');
      });
    });
  });

  describe('image handling', () => {
    it('uses fallback image when no imageUrl provided', () => {
      render(<VoucherCard {...defaultProps} imageUrl={undefined} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/content/vouchers/coffee.jpg');
    });

    it('renders image when imageUrl provided', () => {
      render(<VoucherCard {...defaultProps} imageUrl="/test-image.jpg" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/test-image.jpg');
      expect(img).toHaveAttribute('alt', 'Free Coffee');
    });
  });

  describe('accessibility', () => {
    it('has accessible button role', () => {
      render(<VoucherCard {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('image has alt text', () => {
      render(<VoucherCard {...defaultProps} imageUrl="/test.jpg" />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Free Coffee');
    });
  });
});
