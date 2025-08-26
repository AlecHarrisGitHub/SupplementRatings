// frontend/src/context/BannerContext.jsx

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const BannerContext = createContext({
    currentSupplementName: null,
    setCurrentSupplementName: () => {},
});

export const BannerProvider = ({ children }) => {
    const [currentSupplementName, setCurrentSupplementName] = useState(null);

    const setName = useCallback((name) => {
        setCurrentSupplementName(name || null);
    }, []);

    const value = useMemo(() => ({
        currentSupplementName,
        setCurrentSupplementName: setName,
    }), [currentSupplementName, setName]);

    return (
        <BannerContext.Provider value={value}>
            {children}
        </BannerContext.Provider>
    );
};

export const useBanner = () => useContext(BannerContext);


