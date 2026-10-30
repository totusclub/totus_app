export type OnboardingStep = {
    title: string[];
    description: string[];
    topCardColor: string; // Color for top card background
};

export const onboardingSteps: OnboardingStep[] = [
    {
        title: ['Найдите тур', 'мечты в пару', 'КЛИКОВ'],
        description: [
            'Удобный поиск по странам, городам и',
            'интересам. Мы подберём лучшие',
            'предложения для вашего отдыха.',
        ],
        topCardColor: '#2BA9E2', // Blue
    },
    {
        title: ['Все туры в одном месте'],
        description: [
            'Сравнивайте цены, отели и маршруты от десятков',
            'туроператоров — быстро и прозрачно.',
        ],
        topCardColor: '#FE732E', // Orange
    },
    {
        title: ['Бронируйте без лишних забот'],
        description: [
            'Выбирайте тур, оплачивайте онлайн и получайте',
            'подтверждение сразу в приложении.',
        ],
        topCardColor: '#2BA9E2', // Blue
    },
    {
        title: ['Ваш отдых под контролем'],
        description: [
            'Наши менеджеры всегда на связи. А все детали',
            'тура — в вашем смартфоне.',
        ],
        topCardColor: '#FE732E', // Orange
    },
];

// Текст пользовательского соглашения больше не хранится здесь: экран соглашения загружает
// документ terms из CMS (AgreementStep.tsx → GET /api/pages/slug/terms).

export const totalSteps = onboardingSteps.length + 1; // +1 for agreement step

