import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge, ExpiryBadge, PointsBadge } from './Badge';

describe('Badge', () => {
  describe('basic rendering', () => {
    it('renders with label prop', () => {
      render(<Badge label="Test Label" />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('renders with children', () => {
      render(<Badge>Child Content</Badge>);
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('prefers label over children', () => {
      render(<Badge label="Label">Children</Badge>);
      expect(screen.getByText('Label')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('renders neutral variant by default', () => {
      render(<Badge label="Neutral" />);
      const badge = screen.getByText('Neutral');
      expect(badge).toHaveClass('bg-stone-100');
    });

    it('renders success variant', () => {
      render(<Badge label="Success" variant="success" />);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-success-light');
    });

    it('renders warning variant', () => {
      render(<Badge label="Warning" variant="warning" />);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-warning-light');
    });

    it('renders error variant', () => {
      render(<Badge label="Error" variant="error" />);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-error-light');
    });

    it('renders info variant', () => {
      render(<Badge label="Info" variant="info" />);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-info-light');
    });

    it('renders solid-accent variant', () => {
      render(<Badge label="Accent" variant="solid-accent" />);
      const badge = screen.getByText('Accent');
      expect(badge).toHaveClass('bg-accent');
      expect(badge).toHaveClass('text-white');
    });

    it('renders outline-success variant', () => {
      render(<Badge label="Outline" variant="outline-success" />);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('border-success');
    });

    it('renders featured variant with gradient', () => {
      render(<Badge label="Featured" variant="featured" />);
      const badge = screen.getByText('Featured');
      expect(badge).toHaveClass('bg-gradient-to-r');
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Badge label="Small" size="sm" />);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('h-5');
    });

    it('renders medium size by default', () => {
      render(<Badge label="Medium" />);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('h-[22px]');
    });

    it('renders large size', () => {
      render(<Badge label="Large" size="lg" />);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('h-7');
    });
  });

  describe('icons', () => {
    it('shows icon when showIcon is true', () => {
      render(<Badge label="Active" variant="active" showIcon />);
      // Active variant should show CheckCircle icon
      expect(screen.getByText('Active').parentElement?.querySelector('svg')).toBeInTheDocument();
    });

    it('renders custom icon', () => {
      const CustomIcon = () => <span data-testid="custom-icon">Icon</span>;
      render(<Badge label="Custom" icon={<CustomIcon />} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('status variants (legacy)', () => {
    it('renders statusActive with green dot', () => {
      render(<Badge label="Active" variant="statusActive" />);
      const container = screen.getByText('Active').parentElement;
      expect(container?.querySelector('.bg-success')).toBeInTheDocument();
    });

    it('renders statusInactive with gray dot', () => {
      render(<Badge label="Inactive" variant="statusInactive" />);
      const container = screen.getByText('Inactive').parentElement;
      expect(container?.querySelector('.bg-stone-300')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Badge label="Custom" className="my-custom-class" />);
      expect(screen.getByText('Custom')).toHaveClass('my-custom-class');
    });
  });
});

describe('StatusBadge', () => {
  it('renders active status with default label', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders pending status with default label', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders used status with default label', () => {
    render(<StatusBadge status="used" />);
    expect(screen.getByText('Used')).toBeInTheDocument();
  });

  it('renders expired status with default label', () => {
    render(<StatusBadge status="expired" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<StatusBadge status="active" label="Custom Active" />);
    expect(screen.getByText('Custom Active')).toBeInTheDocument();
  });

  it('shows icon by default', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active').parentElement?.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ExpiryBadge', () => {
  it('renders when expiring today', () => {
    render(<ExpiryBadge daysUntilExpiry={0} />);
    expect(screen.getByText('Expires today!')).toBeInTheDocument();
  });

  it('renders when expiring in 1 day', () => {
    render(<ExpiryBadge daysUntilExpiry={1} />);
    expect(screen.getByText('Expires today!')).toBeInTheDocument();
  });

  it('renders when expiring in 2-3 days', () => {
    render(<ExpiryBadge daysUntilExpiry={2} />);
    expect(screen.getByText('2d left')).toBeInTheDocument();
  });

  it('renders when expiring in 4-7 days', () => {
    render(<ExpiryBadge daysUntilExpiry={5} />);
    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('returns null when more than 7 days', () => {
    const { container } = render(<ExpiryBadge daysUntilExpiry={8} />);
    expect(container.firstChild).toBeNull();
  });

  it('has pulse animation', () => {
    render(<ExpiryBadge daysUntilExpiry={2} />);
    expect(screen.getByText('2d left')).toHaveClass('animate-pulse');
  });
});

describe('PointsBadge', () => {
  it('renders points with label', () => {
    render(<PointsBadge points={15} />);
    expect(screen.getByText('15 pts')).toBeInTheDocument();
  });

  it('renders zero points', () => {
    render(<PointsBadge points={0} />);
    expect(screen.getByText('0 pts')).toBeInTheDocument();
  });

  it('renders large point values', () => {
    render(<PointsBadge points={1000} />);
    expect(screen.getByText('1000 pts')).toBeInTheDocument();
  });

  it('shows star icon', () => {
    render(<PointsBadge points={15} />);
    expect(screen.getByText('15 pts').parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PointsBadge points={15} className="custom-class" />);
    expect(screen.getByText('15 pts')).toHaveClass('custom-class');
  });
});
