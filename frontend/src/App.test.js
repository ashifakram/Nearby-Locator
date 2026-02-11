import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Nearby Locator header', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { name: /Nearby Locator/i });
  expect(headerElement).toBeInTheDocument();
});

test('renders subheader text', () => {
  render(<App />);
  const subheaderElement = screen.getByText(/Discover places around you/i);
  expect(subheaderElement).toBeInTheDocument();
});
