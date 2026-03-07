import { createContext, useContext } from 'react';

export interface TokenContextType {
  githubToken: string;
  setGithubToken: (token: string) => void;
  saveToken: () => void;
  resetToken: () => void;
  isTokenSaved: boolean;
}

export const TokenContext = createContext<TokenContextType>({
  githubToken: '',
  setGithubToken: () => {},
  saveToken: () => {},
  resetToken: () => {},
  isTokenSaved: false,
});

export const useGithubToken = () => useContext(TokenContext);
