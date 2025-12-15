import { render } from '@testing-library/react';
import { OptimizedImage } from '../optimized-image';

let capturedProps: any = null;

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedProps = props;
    return <img src={typeof props.src === 'string' ? props.src : props.src.src} alt={props.alt} />;
  },
}));

describe('OptimizedImage', () => {
  beforeEach(() => {
    capturedProps = null;
  });

  it('should set unoptimized=true for localhost URLs', () => {
    render(
      <OptimizedImage
        src="http://localhost:3002/posters/test.jpg"
        alt="Test"
        width={100}
        height={100}
      />
    );
    
    expect(capturedProps.unoptimized).toBe(true);
  });

  it('should not set unoptimized for external URLs', () => {
    render(
      <OptimizedImage
        src="https://image.tmdb.org/t/p/w500/poster.jpg"
        alt="Test"
        width={100}
        height={100}
      />
    );
    
    expect(capturedProps.unoptimized).toBeUndefined();
  });

  it('should respect explicit unoptimized prop', () => {
    render(
      <OptimizedImage
        src="https://example.com/image.jpg"
        alt="Test"
        width={100}
        height={100}
        unoptimized={true}
      />
    );
    
    expect(capturedProps.unoptimized).toBe(true);
  });

  it('should handle StaticImageData src', () => {
    const staticSrc = {
      src: '/static/image.png',
      height: 100,
      width: 100,
      blurDataURL: 'data:image/png;base64,test',
    };
    
    const { container } = render(
      <OptimizedImage
        src={staticSrc}
        alt="Test"
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(capturedProps.unoptimized).toBeUndefined();
  });
});
