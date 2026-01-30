import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle, ToggleWithLabel } from './Toggle';

describe('Toggle', () => {
  describe('basic rendering', () => {
    it('renders as a switch button', () => {
      render(<Toggle enabled={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
    });

    it('has correct aria-checked when off', () => {
      render(<Toggle enabled={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('has correct aria-checked when on', () => {
      render(<Toggle enabled={true} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('has aria-label when label prop provided', () => {
      render(<Toggle enabled={false} onChange={() => {}} label="Test Toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Test Toggle');
    });
  });

  describe('interactions', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<Toggle enabled={false} onChange={handleChange} />);
      
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when toggling off', () => {
      const handleChange = vi.fn();
      render(<Toggle enabled={true} onChange={handleChange} />);
      
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Toggle enabled={false} onChange={handleChange} disabled />);
      
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('has disabled attribute when disabled', () => {
      render(<Toggle enabled={false} onChange={() => {}} disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('has disabled styling', () => {
      render(<Toggle enabled={false} onChange={() => {}} disabled />);
      expect(screen.getByRole('switch')).toHaveClass('opacity-50');
      expect(screen.getByRole('switch')).toHaveClass('cursor-not-allowed');
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Toggle enabled={false} onChange={() => {}} size="sm" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('h-5');
      expect(toggle).toHaveClass('w-9');
    });

    it('renders medium size by default', () => {
      render(<Toggle enabled={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('h-6');
      expect(toggle).toHaveClass('w-11');
    });

    it('renders large size', () => {
      render(<Toggle enabled={false} onChange={() => {}} size="lg" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('h-7');
      expect(toggle).toHaveClass('w-14');
    });
  });

  describe('variants', () => {
    it('renders default variant with stone-900 when on', () => {
      render(<Toggle enabled={true} onChange={() => {}} variant="default" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-stone-900');
    });

    it('renders accent variant with accent color when on', () => {
      render(<Toggle enabled={true} onChange={() => {}} variant="accent" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-accent');
    });

    it('renders success variant with success color when on', () => {
      render(<Toggle enabled={true} onChange={() => {}} variant="success" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-success');
    });

    it('renders stone-200 background when off regardless of variant', () => {
      render(<Toggle enabled={false} onChange={() => {}} variant="accent" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-stone-200');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Toggle enabled={false} onChange={() => {}} className="my-custom-class" />);
      expect(screen.getByRole('switch')).toHaveClass('my-custom-class');
    });
  });

  describe('thumb animation', () => {
    it('has translate class when enabled', () => {
      render(<Toggle enabled={true} onChange={() => {}} />);
      const thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-5');
    });

    it('has no translate when disabled (off state)', () => {
      render(<Toggle enabled={false} onChange={() => {}} />);
      const thumb = screen.getByRole('switch').querySelector('span');
      expect(thumb).toHaveClass('translate-x-0.5');
    });
  });
});

describe('ToggleWithLabel', () => {
  it('renders label text', () => {
    render(<ToggleWithLabel enabled={false} onChange={() => {}} label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <ToggleWithLabel 
        enabled={false} 
        onChange={() => {}} 
        label="Test Label" 
        description="Test description"
      />
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders toggle component', () => {
    render(<ToggleWithLabel enabled={false} onChange={() => {}} label="Test" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('label is clickable', () => {
    render(<ToggleWithLabel enabled={false} onChange={() => {}} label="Test Label" />);
    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('cursor-pointer');
  });

  it('passes toggle props through', () => {
    const handleChange = vi.fn();
    render(
      <ToggleWithLabel 
        enabled={true} 
        onChange={handleChange} 
        label="Test"
        size="lg"
        variant="success"
      />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveClass('w-14'); // lg size
    expect(toggle).toHaveClass('bg-success'); // success variant when enabled
  });
});
