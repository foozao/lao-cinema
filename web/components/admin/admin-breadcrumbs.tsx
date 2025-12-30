'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { movieAPI, peopleAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';

interface BreadcrumbSegment {
  label: string;
  href: string;
  isLast: boolean;
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('admin');
  const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const buildBreadcrumbs = async () => {
      // Remove locale prefix (e.g., /en/admin or /lo/admin)
      const pathWithoutLocale = pathname.replace(/^\/(en|lo)/, '');
      const parts = pathWithoutLocale.split('/').filter(Boolean);

      // Always start with Admin Dashboard
      const breadcrumbs: BreadcrumbSegment[] = [
        {
          label: t('dashboard'),
          href: '/admin',
          isLast: parts.length === 1, // Only 'admin'
        },
      ];

      // If we're just on /admin, return early
      if (parts.length === 1) {
        setSegments(breadcrumbs);
        return;
      }

      setLoading(true);

      try {
        // Handle different admin routes
        if (parts[1] === 'movies') {
          breadcrumbs.push({
            label: t('allMovies'),
            href: '/admin/movies',
            isLast: parts.length === 2,
          });
        } else if (parts[1] === 'people') {
          if (parts.length === 2) {
            breadcrumbs.push({
              label: t('allPeople'),
              href: '/admin/people',
              isLast: true,
            });
          } else if (parts.length === 3) {
            // Fetch person name
            const personId = parseInt(parts[2]);
            try {
              const person = await peopleAPI.getById(personId);
              const personName = getLocalizedText(person.name, 'en')
                .replace(/^["'"'`]+|["'"'`]+$/g, ''); // Strip leading/trailing quotes
              breadcrumbs.push(
                {
                  label: t('allPeople'),
                  href: '/admin/people',
                  isLast: false,
                },
                {
                  label: personName,
                  href: `/admin/people/${personId}`,
                  isLast: true,
                }
              );
            } catch (error) {
              console.error('Failed to load person:', error);
              breadcrumbs.push({
                label: t('allPeople'),
                href: '/admin/people',
                isLast: true,
              });
            }
          }
        } else if (parts[1] === 'edit' && parts.length === 3) {
          // Movie edit page
          const movieId = parts[2];
          try {
            const movie = await movieAPI.getById(movieId);
            breadcrumbs.push(
              {
                label: t('allMovies'),
                href: '/admin/movies',
                isLast: false,
              },
              {
                label: getLocalizedText(movie.title, 'en'),
                href: `/admin/edit/${movieId}`,
                isLast: true,
              }
            );
          } catch (error) {
            console.error('Failed to load movie:', error);
            breadcrumbs.push({
              label: t('allMovies'),
              href: '/admin/movies',
              isLast: true,
            });
          }
        } else if (parts[1] === 'add') {
          breadcrumbs.push({
            label: t('addNewMovie'),
            href: '/admin/add',
            isLast: true,
          });
        } else if (parts[1] === 'import') {
          breadcrumbs.push({
            label: t('importFromTMDB'),
            href: '/admin/import',
            isLast: true,
          });
        } else if (parts[1] === 'analytics') {
          breadcrumbs.push({
            label: t('analytics'),
            href: '/admin/analytics',
            isLast: true,
          });
        } else if (parts[1] === 'homepage') {
          breadcrumbs.push({
            label: t('homepageSettings'),
            href: '/admin/homepage',
            isLast: true,
          });
        } else if (parts[1] === 'production') {
          breadcrumbs.push({
            label: t('productionCompanies'),
            href: '/admin/production',
            isLast: true,
          });
        } else if (parts[1] === 'audit-logs') {
          breadcrumbs.push({
            label: t('auditLogsTitle'),
            href: '/admin/audit-logs',
            isLast: true,
          });
        } else if (parts[1] === 'genres') {
          breadcrumbs.push({
            label: t('manageGenres'),
            href: '/admin/genres',
            isLast: true,
          });
        } else if (parts[1] === 'short-packs') {
          if (parts.length === 2) {
            breadcrumbs.push({
              label: t('shortPacks'),
              href: '/admin/short-packs',
              isLast: true,
            });
          } else if (parts.length === 3) {
            // Short pack edit page
            const packId = parts[2];
            if (packId === 'new') {
              breadcrumbs.push(
                {
                  label: t('shortPacks'),
                  href: '/admin/short-packs',
                  isLast: false,
                },
                {
                  label: t('newPack') || 'New Pack',
                  href: '/admin/short-packs/new',
                  isLast: true,
                }
              );
            } else {
              try {
                const { shortPacksAPI } = await import('@/lib/api/client');
                const pack = await shortPacksAPI.getById(packId);
                breadcrumbs.push(
                  {
                    label: t('shortPacks'),
                    href: '/admin/short-packs',
                    isLast: false,
                  },
                  {
                    label: getLocalizedText(pack.title, 'en'),
                    href: `/admin/short-packs/${packId}`,
                    isLast: true,
                  }
                );
              } catch (error) {
                console.error('Failed to load short pack:', error);
                breadcrumbs.push({
                  label: t('shortPacks'),
                  href: '/admin/short-packs',
                  isLast: true,
                });
              }
            }
          }
        } else if (parts[1] === 'accolades') {
          if (parts.length === 2) {
            breadcrumbs.push({
              label: t('accolades'),
              href: '/admin/accolades',
              isLast: true,
            });
          } else if (parts.length === 3) {
            // Accolade event detail page
            const showId = parts[2];
            try {
              const { awardsAPI } = await import('@/lib/api/client');
              const show = await awardsAPI.getShow(showId);
              breadcrumbs.push(
                {
                  label: t('accolades'),
                  href: '/admin/accolades',
                  isLast: false,
                },
                {
                  label: getLocalizedText(show.name, 'en'),
                  href: `/admin/accolades/${showId}`,
                  isLast: true,
                }
              );
            } catch (error) {
              console.error('Failed to load accolade event:', error);
              breadcrumbs.push({
                label: t('accolades'),
                href: '/admin/accolades',
                isLast: true,
              });
            }
          }
        }

        setSegments(breadcrumbs);
      } finally {
        setLoading(false);
      }
    };

    buildBreadcrumbs();
  }, [pathname, t]);

  // Don't show breadcrumbs on the main dashboard page
  if (segments.length === 1 && segments[0].href === '/admin') {
    return null;
  }

  if (segments.length === 0 || loading) {
    return (
      <div className="h-10 flex items-center">
        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {segments.map((segment, index) => (
        <div key={segment.href} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          {segment.isLast ? (
            <span className="font-medium text-gray-900">{segment.label}</span>
          ) : (
            <Link
              href={segment.href}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {segment.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
