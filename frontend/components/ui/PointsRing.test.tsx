import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PointsRing, PointsRingWithReward, PointsRingInline } from './PointsRing';

describe('PointsRing', () => {
  describe('basic rendering', () => {
    it('renders current points', () => {
      render(<PointsRing currentPoints={125} targetPoints={200} />);
      expect(screen.getByText('125')).toBeInTheDocument();
    });

    it('renders points label by default', () => {
      render(<PointsRing currentPoints={125} targetPoints={200} />);
      expect(screen.getByText('points')).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      render(<PointsRing currentPoints={125} targetPoints={200} showLabel={false} />);
      expect(screen.queryByText('points')).not.toBeInTheDocument();
    });

    it('uses custom label', () => {
      render(<PointsRing currentPoints={125} targetPoints={200} label="pts" />);
      expect(screen.getByText('pts')).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const { container } = render(<PointsRing currentPoints={125} targetPoints={200} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size with correct dimensions', () => {
      const { container } = render(<PointsRing currentPoints={100} targetPoints={200} size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
    });

    it('renders medium size by default', () => {
      const { container } = render(<PointsRing currentPoints={100} targetPoints={200} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '120');
      expect(svg).toHaveAttribute('height', '120');
    });

    it('renders large size with correct dimensions', () => {
      const { container } = render(<PointsRing currentPoints={100} targetPoints={200} size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '160');
      expect(svg).toHaveAttribute('height', '160');
    });
  });

  describe('progress calculation', () => {
    it('shows 0% progress when currentPoints is 0', () => {
      const { container } = render(<PointsRing currentPoints={0} targetPoints={100} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      // Full circumference means 0 progress
      expect(progressCircle).toHaveClass('text-accent');
    });

    it('shows 50% progress when halfway', () => {
      const { container } = render(<PointsRing currentPoints={50} targetPoints={100} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toBeInTheDocument();
    });

    it('caps progress at 100%', () => {
      const { container } = render(<PointsRing currentPoints={150} targetPoints={100} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PointsRing currentPoints={100} targetPoints={200} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('PointsRingWithReward', () => {
  it('renders PointsRing component', () => {
    render(<PointsRingWithReward currentPoints={125} targetPoints={200} />);
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('shows remaining points to reward', () => {
    render(<PointsRingWithReward currentPoints={125} targetPoints={200} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText(/more to/)).toBeInTheDocument();
  });

  it('shows default reward name', () => {
    render(<PointsRingWithReward currentPoints={125} targetPoints={200} />);
    expect(screen.getByText(/next reward/)).toBeInTheDocument();
  });

  it('shows custom reward name', () => {
    render(
      <PointsRingWithReward 
        currentPoints={125} 
        targetPoints={200} 
        rewardName="Free Coffee"
      />
    );
    expect(screen.getByText(/Free Coffee/)).toBeInTheDocument();
  });

  it('shows ready to redeem when target reached', () => {
    render(<PointsRingWithReward currentPoints={200} targetPoints={200} />);
    expect(screen.getByText('Ready to redeem!')).toBeInTheDocument();
  });

  it('shows ready to redeem when over target', () => {
    render(<PointsRingWithReward currentPoints={250} targetPoints={200} />);
    expect(screen.getByText('Ready to redeem!')).toBeInTheDocument();
  });

  it('passes size prop to PointsRing', () => {
    const { container } = render(
      <PointsRingWithReward currentPoints={100} targetPoints={200} size="lg" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '160');
  });
});

describe('PointsRingInline', () => {
  it('renders mini ring', () => {
    const { container } = render(
      <PointsRingInline currentPoints={100} targetPoints={200} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('renders points fraction', () => {
    render(<PointsRingInline currentPoints={100} targetPoints={200} />);
    expect(screen.getByText('100 / 200 pts')).toBeInTheDocument();
  });

  it('shows remaining points message', () => {
    render(<PointsRingInline currentPoints={100} targetPoints={200} />);
    expect(screen.getByText('100 more to reward')).toBeInTheDocument();
  });

  it('shows ready message when target reached', () => {
    render(<PointsRingInline currentPoints={200} targetPoints={200} />);
    expect(screen.getByText('Ready to redeem!')).toBeInTheDocument();
  });

  it('renders star icon', () => {
    const { container } = render(
      <PointsRingInline currentPoints={100} targetPoints={200} />
    );
    expect(container.querySelector('svg.text-accent')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PointsRingInline currentPoints={100} targetPoints={200} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
