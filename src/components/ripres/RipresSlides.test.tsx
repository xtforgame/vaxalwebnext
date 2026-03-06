import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RipresSlides from './RipresSlides';
import { RipresSlide } from './types';

describe('RipresSlides Keyboard Navigation', () => {
  const slides: RipresSlide[] = [
    {
      path: '/slide1',
      title: 'Slide 1',
      element: <div data-testid="slide-1">Slide 1 Content</div>,
    },
    {
      path: '/slide2',
      title: 'Slide 2',
      element: <div data-testid="slide-2">Slide 2 Content</div>,
    },
    {
      path: '/slide3',
      title: 'Slide 3',
      element: <div data-testid="slide-3">Slide 3 Content</div>,
    },
  ];

  const renderWithRouter = (initialEntry = '/slide1') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <RipresSlides slides={slides} />
      </MemoryRouter>
    );
  };

  it('navigates to next slide on ArrowRight', () => {
    renderWithRouter('/slide1');
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();
  });

  it('navigates to next slide on ArrowDown', () => {
    renderWithRouter('/slide1');
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();
  });

  it('navigates to next slide on PageDown', () => {
    renderWithRouter('/slide1');
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();
  });

  it('navigates to previous slide on ArrowLeft', () => {
    renderWithRouter('/slide2');
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();
  });

  it('navigates to previous slide on ArrowUp', () => {
    renderWithRouter('/slide2');
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();
  });

  it('navigates to previous slide on PageUp', () => {
    renderWithRouter('/slide2');
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'PageUp' });
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();
  });

  it('does not navigate past the last slide', () => {
    renderWithRouter('/slide3');
    expect(screen.getByTestId('slide-3')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('slide-3')).toBeInTheDocument();
  });

  it('does not navigate before the first slide', () => {
    renderWithRouter('/slide1');
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();
  });
});
