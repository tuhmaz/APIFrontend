import Link from 'next/link';
import { Home, ChevronLeft } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS, COUNTRIES } from '@/lib/api/config';

interface SchoolClass {
  id: number;
  grade_name: string;
  grade_level: number;
}

async function getClassData(countryCode: string, classId: string) {
  const countryObj = COUNTRIES.find(c => c.code === countryCode);
  const countryId = countryObj?.id || '1';

  try {
    const response = await apiClient.get<SchoolClass>(
      API_ENDPOINTS.FRONTEND.CLASS_DETAILS(classId),
      { 
        database: countryCode,
        country_id: countryId
      }
    );
    
    // Handle Laravel Resource wrapping if necessary
    let data: any = response.data;
    if (data.data) {
      data = data.data;
    }
    
    return data as SchoolClass;
  } catch (err) {
    console.error('Error fetching class data:', err);
    return null;
  }
}

export default async function ClassBreadcrumb({ 
  countryCode, 
  classId,
  className,
  classLevel
}: { 
  countryCode: string; 
  classId: string;
  className?: string | null;
  classLevel?: number | null;
}) {
  const schoolClass = className
    ? { id: Number(classId), grade_name: className, grade_level: classLevel ?? 0 }
    : await getClassData(countryCode, classId);

  return (
    <nav
      aria-label="breadcrumb"
      className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-100/50 shadow-lg"
    >
      <ol className="flex items-center flex-wrap gap-2 text-sm text-slate-600">
        <li>
          <Link
            href="/"
            className="flex items-center hover:text-blue-600 transition-colors"
          >
            <Home className="w-4 h-4 ml-1" />
            <span>الرئيسية</span>
          </Link>
        </li>
        <li>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </li>
        <li>
          <Link
            href={`/${countryCode}/lesson`}
            className="hover:text-blue-600 transition-colors"
          >
            الصفوف الدراسية
          </Link>
        </li>
        <li>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </li>
        <li className="font-semibold text-slate-900" aria-current="page">
          {schoolClass?.grade_name || `صف رقم ${classId}`}
        </li>
      </ol>
    </nav>
  );
}
