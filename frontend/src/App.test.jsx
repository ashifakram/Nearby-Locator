import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Nearby Locator text', async () => {
  render(<App />);
  const textElements = await screen.findAllByText(/Nearby Locator/i, {}, { timeout: 3000 });
  expect(textElements.length).toBeGreaterThan(0);
});
