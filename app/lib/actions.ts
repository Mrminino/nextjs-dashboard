'use server';


import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            const authError = error as AuthError & { type?: string };
          
            switch (authError.type) {
              case 'CredentialsSignin':
                return 'Invalid credentials.';
              default:
                return 'Something went wrong.';
            }

      }
      throw error;
    }
  }

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });



const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
      .number()
      .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
  });

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };

  export async function createInvoice(prevState: State, formData: FormData) {
    // Validate form using Zod
    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
   
    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
   
    // Insert data into the database
    try {
      await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
      // If a database error occurs, return a more specific error.
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }
   
    // Revalidate the cache for the invoices page and redirect the user.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }


// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
// ...

 
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;
 
  try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
  } catch (error) {
    // We'll log the error to the console for now
    console.error(error);
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
   
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  }

  const customerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    image_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
  });
  
  export type CustomerFormState = {
    errors?: { name?: string[]; email?: string[]; image_url?: string[] };
    message?: string | null;
  };
  
  export async function createCustomer(
    prevState: CustomerFormState,
    formData: FormData
  ): Promise<CustomerFormState> {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const image = formData.get('image') as File | null;
  
    if (!name || !email) {
      return {
        errors: {
          name: !name ? ['Name is required'] : undefined,
          email: !email ? ['Email is required'] : undefined,
        },
        message: 'Invalid data.',
      };
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        errors: { email: ['Invalid email address'] },
        message: 'Invalid data.',
      };
    }
  
    let imageUrl: string | null = null;
  
    if (image && image.size > 0) {
      const imageBuffer = Buffer.from(await image.arrayBuffer());
      const fileExt = path.extname(image.name);
      const fileName = `${randomUUID()}${fileExt}`;
      const dir = path.join(process.cwd(), 'public', 'customers');
      const filePath = path.join(dir, fileName);
  
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, imageBuffer);
        imageUrl = `/customers/${fileName}`;
      } catch (err) {
        console.error('Error saving image:', err);
        return { message: 'Error saving image.' };
      }
    }
  
    try {
      await sql`
        INSERT INTO customers (name, email, image_url)
        VALUES (${name}, ${email}, ${imageUrl})
      `;
      return { message: 'Customer created successfully!' };
    } catch (err) {
      console.error('Database Error:', err);
      return { message: 'Failed to create customer.' };
    }
  }
  
  
  export async function updateCustomer(id: string, formData: FormData): Promise<CustomerFormState> {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const image = formData.get('image_url') as File | null;
  
    if (!name || !email) {
      return {
        errors: {
          name: !name ? ['Name is required'] : undefined,
          email: !email ? ['Email is required'] : undefined,
        },
        message: 'Invalid data.',
      };
    }
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        errors: { email: ['Invalid email address'] },
        message: 'Invalid data.',
      };
    }
  
    let imageUrl: string | null = null;
  
    // Guardar imagen si viene un archivo nuevo
    if (image && typeof image !== 'string' && image.size > 0) {
      const imageBuffer = Buffer.from(await image.arrayBuffer());
      const fileExt = path.extname(image.name);
      const fileName = `${randomUUID()}${fileExt}`;
      const dir = path.join(process.cwd(), 'public', 'customers');
      const filePath = path.join(dir, fileName);
  
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, imageBuffer);
        imageUrl = `/customers/${fileName}`;
      } catch (err) {
        console.error('Error saving image:', err);
        return { message: 'Error saving image.' };
      }
    }
  
    try {
      await sql`
        UPDATE customers
        SET name = ${name}, email = ${email},
        image_url = ${imageUrl ?? null}
        WHERE id = ${id}
      `;
    } catch (err) {
      console.error('Database Error:', err);
      return { message: 'Failed to update customer.' };
    }
  
    revalidatePath('/dashboard/customers');
    redirect('/dashboard/customers');
  }
  
  // Eliminar Customer
  export async function deleteCustomer(id: string) {
    await sql`DELETE FROM customers WHERE id = ${id}`;
    revalidatePath('/dashboard/customers');
  }
  