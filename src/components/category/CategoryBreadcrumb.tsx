import Link from 'next/link';
import { Home, ChevronLeft, BookOpen, FileText } from 'lucide-react';
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
      },
      { next: { revalidate: 300 } } as any
    );
    
    let data: any = response.data;
    if (data.data) {
      data = data.data;
    }
    
    return data as SchoolClass;
  } catch {
    return null;
  }
}

export default async function CategoryBreadcrumb({ 
  countryCode, 
  classId, 
  subjectId,
  subjectName,
  categoryName,
  semesterName
}: { 
  countryCode: string; 
  classId: string; 
  subjectId: string;
  categoryId: string;
  subjectName: string;
  categoryName: string;
  semesterName: string;
}) {
  const schoolClass = await getClassData(countryCode, classId);

  return (
    <nav aria-label="breadcrumb" className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <ol className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
        <li>
          <Link href="/" className="flex items-center hover:text-blue-600 transition-colors">
            <Home className="w-4 h-4 ml-1" />
            <span>الرئيسية</span>
          </Link>
        </li>
        <li>
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </li>
        <li>
          <Link href={`/${countryCode}`} className="hover:text-blue-600 transition-colors">
            الصفوف الدراسية
          </Link>
        </li>
        <li>
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </li>
        <li>
          <Link href={`/${countryCode}/lesson/${classId}`} className="hover:text-blue-600 transition-colors">
            {schoolClass?.grade_name || classId}
          </Link>
        </li>
        <li>
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </li>
        <li>
          <Link href={`/${countryCode}/lesson/subjects/${subjectId}?id=${classId}`} className="hover:text-blue-600 transition-colors flex items-center">
             <BookOpen className="w-4 h-4 ml-1" />
            {subjectName}
          </Link>
        </li>
        <li>
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </li>
        <li className="font-medium text-gray-900 flex items-center" aria-current="page">
          <FileText className="w-4 h-4 ml-1 text-primary" />
          {categoryName} - {semesterName}
        </li>
      </ol>
    </nav>
  );
}
