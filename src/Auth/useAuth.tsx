import React, { useState, useMemo, useDebugValue } from 'react';
import { useContext, createContext, useCallback } from 'react';
import { WebAuth } from 'auth0-js';
import history from '../history';

import { AUTH_CONFIG } from './auth0-variables';

const generateAuth = () =>
  new WebAuth({
    domain: AUTH_CONFIG.domain,
    clientID: AUTH_CONFIG.clientID,
    redirectUri: AUTH_CONFIG.callbackUrl,
    responseType: 'token id_token',
    scope: 'openid'
  });

const Auth0Context = createContext<ReturnType<typeof useContextValue>>(null);

export const useAuthState = () => {
  return useState({
    accessToken: null,
    idToken: null,
    expiresAt: 0
  });
};

export const useIsAuthenticatedMemo = (auth, expiresAt) => {
  return useMemo(() => {
    return new Date().getTime() < expiresAt;
  }, [auth, expiresAt]);
};

const useContextValue = () => {
  const [authState, updateAuthState] = useAuthState();
  return {
    auth0: generateAuth(),
    // lock: generateLock(),
    authState,
    updateAuthState
  };
};

export const Auth0Provider = ({ children }) => {
  const value = useContextValue();
  return (
    <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>
  );
};

export const useAuth0Context = () => {
  return useContext(Auth0Context);
};

export const useAuth0 = () => {
  const { auth0, authState, updateAuthState } = useContext(Auth0Context);

  const isAuthenticatedMemo = useIsAuthenticatedMemo(
    auth0,
    authState.expiresAt
  );

  useDebugValue(isAuthenticatedMemo);
  useDebugValue(authState);

  const login = () => {
    // lock.show();
    auth0.authorize();
  };

  const logout = () => {
    updateAuthState({
      accessToken: null,
      idToken: null,
      expiresAt: 0
    });
    localStorage.removeItem('isLoggedIn');

    auth0.logout({
      returnTo: window.location.origin
    });

    // navigate to the home route
    history.replace('/home');
  };

  const setSession = authResult => {
    console.log(authResult);
    localStorage.setItem('isLoggedIn', 'true');

    let expiresAt = authResult.expiresIn * 1000 + new Date().getTime();
    updateAuthState({
      accessToken: authResult.accessToken,
      idToken: authResult.idToken,
      expiresAt: expiresAt
    });
    history.replace('/home');
  };
  // useDebugValue(authState);

  const renewSession = () => {
    console.log('renew');
    auth0.checkSession({}, (err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        setSession(authResult);
      } else if (err) {
        logout();
        console.error(err);
        alert(
          `Could not get a new token (${err.error}: ${err.error_description}).`
        );
      }
    });
  };

  const handleAuthentication = () => {
    auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken && authResult.idToken) {
        setSession(authResult);
      } else if (err) {
        history.replace('/home');
        console.error(err);
        alert(`Error: ${err.error}. Check the console for further details.`);
      }
    });
  };
  return {
    auth: auth0,
    login,
    logout,
    handleAuthentication,
    isAuthenticatedMemo,
    renewSession,
    authState
  };
};
