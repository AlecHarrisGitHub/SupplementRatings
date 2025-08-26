// frontend/src/components/AmazonBanner.jsx

import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Box, Button, Container, Link as MuiLink, Typography } from '@mui/material';
import { useBanner } from '../context/BannerContext';

// Read affiliate links from env. Prefer VITE_ vars, but also support user's AMAZON_* names.
const HOME_LINK = import.meta.env.VITE_AFFILIATE_HOME_LINK || import.meta.env.AMAZON_AFFILIATE_LINK_HOME || '';
const CATEGORY_LINK_TEMPLATE = import.meta.env.VITE_AFFILIATE_CATEGORY_LINK || import.meta.env.AMAZON_AFFILIATE_LINK_CATEGORY || '';

function buildCategoryLink(template, supplementName) {
    if (!template || !supplementName) return template || '';
    try {
        const url = new URL(template);
        const normalized = String(supplementName).trim();
        // Update Amazon search parameters only; do not change the path (e.g., '/s')
        url.searchParams.set('k', normalized);
        if (url.searchParams.has('keywords')) {
            url.searchParams.set('keywords', normalized);
        }
        return url.toString();
    } catch (e) {
        // Fallback: replace the k / keywords query params in a plain string safely
        const normalized = String(supplementName).trim();
        const encodedPlus = encodeURIComponent(normalized).replace(/%20/g, '+');
        let output = template;
        if (/([?&])k=/i.test(output)) {
            output = output.replace(/([?&])k=[^&]*/i, `$1k=${encodedPlus}`);
        } else {
            output += (output.includes('?') ? '&' : '?') + `k=${encodedPlus}`;
        }
        if (/([?&])keywords=/i.test(output)) {
            output = output.replace(/([?&])keywords=[^&]*/i, `$1keywords=${encodedPlus}`);
        }
        return output;
    }
}

export default function AmazonBanner() {
    const { currentSupplementName } = useBanner();
    const warnedRef = useRef(false);

    const isCategory = Boolean(currentSupplementName);
    const href = useMemo(() => {
        if (isCategory) {
            return buildCategoryLink(CATEGORY_LINK_TEMPLATE, currentSupplementName);
        }
        return HOME_LINK;
    }, [isCategory, currentSupplementName]);

    useEffect(() => {
        if (!warnedRef.current) {
            if (!HOME_LINK) {
                console.warn('Affiliate HOME link is not set (VITE_AFFILIATE_HOME_LINK or AMAZON_AFFILIATE_LINK_HOME). Banner will be hidden.');
            }
            if (!CATEGORY_LINK_TEMPLATE) {
                console.warn('Affiliate CATEGORY link is not set (VITE_AFFILIATE_CATEGORY_LINK or AMAZON_AFFILIATE_LINK_CATEGORY). Category banner will fallback to HOME.');
            }
            warnedRef.current = true;
        }
    }, []);

    if (!href) return null;

    return (
        <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Container maxWidth="xl" sx={{ py: 1 }}>
                <Alert
                    severity="info"
                    icon={false}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.12)' : 'rgba(25,118,210,0.08)',
                        border: '1px solid',
                        borderColor: 'divider',
                        py: { xs: 1, sm: 1 },
                        px: { xs: 1.5, sm: 2 },
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {isCategory ? `Shop ${currentSupplementName} on Amazon` : 'Shop on Amazon to support Supplement Ratings'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isCategory ? 'Your click helps support the site while finding products for this supplement.' : 'Your purchases via this link support the site at no extra cost.'}
                        </Typography>
                    </Box>
                    <Button
                        component={MuiLink}
                        href={href}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{ ml: { sm: 2 }, whiteSpace: 'nowrap' }}
                    >
                        {isCategory ? `View ${currentSupplementName} on Amazon` : 'Shop Amazon'}
                    </Button>
                </Alert>
            </Container>
        </Box>
    );
}


