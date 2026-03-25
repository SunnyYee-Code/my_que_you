import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { CityProvider, useCity } from '@/contexts/CityContext';

const useQueryMock = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: any[]) => useQueryMock(...args),
  };
});

function Consumer() {
  const { currentCity, allCities, setCurrentCity, loading } = useCity();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="current-city">{currentCity.id}:{currentCity.name}</div>
      <div data-testid="all-count">{allCities.length}</div>
      <button onClick={() => setCurrentCity(allCities[1])}>切换</button>
    </div>
  );
}

function renderWithProviders() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <Consumer />
      </CityProvider>
    </QueryClientProvider>
  );
}

describe('CityContext', () => {
  it('restores selected city from localStorage', async () => {
    localStorage.setItem('selectedCity', 'shanghai');
    useQueryMock.mockReturnValue({
      data: [
        { id: 'chengdu', name: '成都' },
        { id: 'shanghai', name: '上海' },
      ],
      isLoading: false,
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('current-city')).toHaveTextContent('shanghai:上海');
    });
  });

  it('persists selected city when changed', async () => {
    const user = userEvent.setup();
    useQueryMock.mockReturnValue({
      data: [
        { id: 'chengdu', name: '成都' },
        { id: 'shanghai', name: '上海' },
      ],
      isLoading: false,
    });

    renderWithProviders();
    await user.click(screen.getByRole('button', { name: '切换' }));

    expect(localStorage.getItem('selectedCity')).toBe('shanghai');
    expect(screen.getByTestId('current-city')).toHaveTextContent('shanghai:上海');
  });
});
