import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Products we want to access
export const PLAID_PRODUCTS: Products[] = [
  Products.Transactions,
  Products.Investments,
  Products.Liabilities,
];

// Countries we support
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Ca, CountryCode.Us];

// Plaid Link redirect URI for OAuth (required for Canadian banks)
export const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || 'http://localhost:3000/api/plaid/oauth-callback';

