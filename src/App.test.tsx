import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByText(/MVP Template/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders the counter with initial value of 0', () => {
    render(<App />);
    const countElement = screen.getByText('0');
    expect(countElement).toBeInTheDocument();
  });

  it('increments counter when + button is clicked', () => {
    render(<App />);
    const incrementButton = screen.getAllByRole('button').find(btn => btn.textContent === '+');
    const countElement = screen.getByText('0');

    if (incrementButton) {
      fireEvent.click(incrementButton);
      expect(countElement).toHaveTextContent('1');
    }
  });

  it('decrements counter when - button is clicked', () => {
    render(<App />);
    const decrementButton = screen.getAllByRole('button').find(btn => btn.textContent === '-');
    const countElement = screen.getByText('0');

    if (decrementButton) {
      fireEvent.click(decrementButton);
      expect(countElement).toHaveTextContent('-1');
    }
  });

  it('displays all feature items', () => {
    render(<App />);
    expect(screen.getByText(/TypeScript with strict mode/i)).toBeInTheDocument();
    expect(screen.getByText(/React 18 with Vite/i)).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare Workers ready/i)).toBeInTheDocument();
  });
});
