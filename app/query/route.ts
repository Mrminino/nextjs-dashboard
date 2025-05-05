import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function listInvoices() {
  return await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;
}

async function listCustomers() {
  return await sql`
    SELECT
      customers.id,
      customers.name,
      customers.email,
      customers.image_url,
      COUNT(invoices.id) AS total_invoices,
      SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
      SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
    FROM customers
    LEFT JOIN invoices ON customers.id = invoices.customer_id
    GROUP BY customers.id, customers.name, customers.email, customers.image_url
    ORDER BY customers.name ASC;
  `;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'invoices') {
      const invoices = await listInvoices();
      return Response.json(invoices);
    } else if (type === 'customers') {
      const customers = await listCustomers();
      return Response.json(customers);
    } else {
      return Response.json({ error: 'Invalid or missing type parameter (use ?type=invoices or ?type=customers)' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
