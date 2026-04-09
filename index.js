const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const axios = require('axios');

// Fonction pour obtenir le token OAuth2
async function generateAccessToken() {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString('base64');
    const { data } = await axios.post(
        `${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`,
        {
            grant_type: 'client_credentials',
        },
        {
            headers: {
                Authorization: `Basic ${auth}`,
                'content-type': 'application/x-www-form-urlencoded',
            },
        },
    );
    return data.access_token;
}

// Routes
app.get('/api/orders', async (req, res) => {
    const token = await generateAccessToken();
    console.log('Access Token:', token);
    const { data, status } = await axios.post(
        process.env.PAYPAL_BASE_URL + '/v2/checkout/orders',
        {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'EUR',
                        value: '100.00',
                    },
                },
            ],
            /* NEW */
            payment_source: {
                paypal: {
                    experience_context: {
                        return_url: 'http://localhost:3000/success',
                        cancel_url: 'http://localhost:3000/cancel',
                        user_action: 'PAY_NOW',
                    },
                },
            },
        },
        {
            headers: {
                Authorization: 'Bearer ' + token,
            },
        },
    );

    const links = data.links;
    const payerActionLinkObject = links.find((l) => l.rel === 'payer-action');
    const targetLink = payerActionLinkObject.href;

    res.redirect(targetLink);
});

app.get('/success', (req, res) => {
    // Sauvegarder trace du paiement paypal (token, payer id)
    res.status(200).json('Order confirmed');
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
