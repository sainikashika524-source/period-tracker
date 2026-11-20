import type { Article } from '../lib/types'

export const ARTICLES: Article[] = [
  {
    slug: 'what-is-it',
    position: 1,
    letter: 'A',
    nav_label: 'What is it?',
    title: 'What is menstruation?',
    summary: 'A normal, healthy part of the reproductive system — not an illness.',
    body: [
      {
        type: 'p',
        text: 'Menstruation (a “period”) is when the lining of the uterus sheds and leaves the body as blood through the vagina. It happens roughly once a month for people with a uterus, usually starting between ages 10 and 16 and continuing until menopause, typically around 45–55.',
      },
      {
        type: 'p',
        text: 'Each month the body prepares the uterine lining for a possible pregnancy. If no pregnancy happens, hormone levels drop and the lining is released. The blood you see is a mix of blood, tissue and mucus — and its colour can range from bright red to dark brown, which is normal.',
      },
      { type: 'tip', text: 'The first period is called menarche. Cycles are often irregular for the first 1–2 years — that is expected.' },
    ],
  },
  {
    slug: 'the-cycle',
    position: 2,
    letter: 'B',
    nav_label: 'The Cycle',
    title: 'Understanding the menstrual cycle',
    summary: 'Counted from day 1 of one period to day 1 of the next.',
    body: [
      {
        type: 'p',
        text: 'The menstrual cycle is counted from the first day of one period to the first day of the next. A “typical” cycle is often described as 28 days, but anywhere from about 21 to 35 days is common and normal in adults (21–45 days in teens). The cycle has four broad phases:',
      },
      {
        type: 'ul',
        items: [
          { title: 'Menstrual phase', text: 'the uterine lining sheds (your period), typically 3–7 days.' },
          { title: 'Follicular phase', text: 'oestrogen rises and follicles in the ovary mature; the lining starts to rebuild.' },
          { title: 'Ovulation', text: 'an egg is released, usually about 14 days before the next period. This is the most fertile time.' },
          { title: 'Luteal phase', text: 'progesterone rises to support a possible pregnancy. If none occurs, hormones drop and the next period begins.' },
        ],
      },
      { type: 'tip', text: 'Tracking for 3 or more cycles gives a much more reliable picture of your own pattern than any “average”.' },
    ],
  },
  {
    slug: 'hygiene',
    position: 3,
    letter: 'C',
    nav_label: 'Hygiene',
    title: 'Menstrual hygiene basics',
    summary: 'Small, consistent habits that keep you comfortable and reduce infection risk.',
    body: [
      {
        type: 'ul',
        items: [
          { title: 'Change regularly', text: 'change pads every 4–6 hours, tampons every 4–8 hours (never more than 8), and empty a cup every 8–12 hours.' },
          { title: 'Wash your hands', text: 'before and after changing any product.' },
          { title: 'Keep it simple', text: 'wash the outer genital area with plain water or a mild, unscented wash. The vagina cleans itself — douching is not needed and can cause irritation.' },
          { title: 'Dispose safely', text: 'wrap used pads or tampons in paper or their wrapper and put them in a bin. Never flush them.' },
          { title: 'Wear breathable underwear', text: 'cotton underwear helps keep the area dry and comfortable.' },
        ],
      },
      {
        type: 'warn',
        text: 'Toxic shock syndrome (TSS) is rare but serious and linked to leaving tampons in too long. Seek urgent care for sudden high fever, rash, vomiting or dizziness while using a tampon.',
      },
    ],
  },
  {
    slug: 'products',
    position: 4,
    letter: 'D',
    nav_label: 'Products',
    title: 'Choosing a product',
    summary: 'Pads, tampons, cups and period underwear all work — pick what suits you.',
    body: [
      {
        type: 'ul',
        items: [
          { title: 'Pads', text: 'stick to underwear, easy to use and widely available. Good for beginners and for overnight.' },
          { title: 'Tampons', text: 'worn inside the vagina; good for sport and swimming. Use the lowest absorbency you need.' },
          { title: 'Menstrual cups', text: 'reusable silicone cups that collect blood. Low cost over time and less waste; can be worn up to 12 hours.' },
          { title: 'Period underwear', text: 'washable underwear with an absorbent layer — comfortable and reusable.' },
          { title: 'Cloth pads', text: 'reusable and affordable; wash in soap and water and dry fully in sunlight.' },
        ],
      },
      { type: 'tip', text: 'The “right” product depends on your flow, comfort, budget and lifestyle. Many people use more than one.' },
    ],
  },
  {
    slug: 'healthy-habits',
    position: 5,
    letter: 'E',
    nav_label: 'Healthy Habits',
    title: 'Healthy habits through your cycle',
    summary: 'Food, movement, sleep and water all make periods easier.',
    body: [
      {
        type: 'ul',
        items: [
          { title: 'Eat iron-rich foods', text: 'lentils, beans, leafy greens, jaggery and meat help replace iron lost in blood. Pair them with vitamin C (citrus, amla) to absorb more.' },
          { title: 'Stay hydrated', text: 'water can reduce bloating and headaches.' },
          { title: 'Keep moving', text: 'light exercise like walking, yoga or cycling can ease cramps and lift mood.' },
          { title: 'Prioritise sleep', text: '7–9 hours helps hormones and mood stay steady.' },
          { title: 'Limit salt, sugar and caffeine', text: 'especially in the luteal phase, to reduce bloating and irritability.' },
        ],
      },
    ],
  },
  {
    slug: 'pain-symptoms',
    position: 6,
    letter: 'F',
    nav_label: 'Pain & Symptoms',
    title: 'Pain, PMS and when to see a doctor',
    summary: 'Some discomfort is common. Pain that stops your life is not.',
    body: [
      {
        type: 'p',
        text: 'Cramps (dysmenorrhoea) happen when the uterus contracts to shed its lining. Many people also notice PMS a few days before their period: bloating, breast tenderness, acne, tiredness or mood changes.',
      },
      {
        type: 'ul',
        items: [
          { title: 'Heat', text: 'a hot water bottle on the lower belly relaxes muscles.' },
          { title: 'Movement and stretching', text: 'gentle activity improves blood flow.' },
          { title: 'Pain relief', text: 'over-the-counter options like ibuprofen can help — follow the label and ask a pharmacist if unsure.' },
        ],
      },
      {
        type: 'warn',
        text: 'See a doctor if pain stops you from going to school or work, periods last longer than 7 days, you soak a pad or tampon every 1–2 hours, cycles are regularly shorter than 21 or longer than 35 days, or periods stop for 3+ months without pregnancy. Conditions like PCOS and endometriosis are common and treatable.',
      },
    ],
  },
]
