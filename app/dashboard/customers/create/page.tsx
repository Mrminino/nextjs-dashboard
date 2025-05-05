import Form from '@/app/ui/customers/create-form';
import Breadcrumbs from '@/app/ui/customers/breadcumbs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Customer',
};
interface Props {
    searchParams?: {
      query?: string;
      page?: string;
    };
  }

  export default function Page({ searchParams }: Props) {
    const query = searchParams?.query;
    const page = searchParams?.page;
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Customers', href: '/dashboard/customers' },
          {
            label: 'Create Customer',
            href: '/dashboard/customers/create',
            active: true,
          },
        ]}
      />
      <Form />
    </main>
  );
}
