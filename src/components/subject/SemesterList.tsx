import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

interface FileCategory {
  id: number | string;
  name: string;
  slug?: string;
  files_count?: number;
  articles_count?: number;
}

interface Semester {
  id: number;
  semester_name: string;
  slug?: string;
  file_categories?: FileCategory[];
  articles_count?: number;
  files_count?: number;
  grade_level?: number;
}

export const STANDARD_CATEGORIES = [
  { id: 'plans', name: 'خطط الدراسة', slug: 'plans' },
  { id: 'papers', name: 'أوراق عمل', slug: 'papers' },
  { id: 'tests', name: 'اختبارات', slug: 'tests' },
  { id: 'books', name: 'كتب المدرسة', slug: 'books' },
  { id: 'records', name: 'السجلات', slug: 'records' },
];

const getCategoryStyle = (id: string) => {
  switch (id) {
    case 'plans':
      return 'border-gray-400 text-gray-600 hover:bg-gray-50';
    case 'papers':
      return 'border-green-500 text-green-600 hover:bg-green-50';
    case 'tests':
      return 'border-red-500 text-red-600 hover:bg-red-50';
    case 'books':
      return 'border-yellow-500 text-yellow-600 hover:bg-yellow-50';
    case 'records':
      return 'border-cyan-500 text-cyan-600 hover:bg-cyan-50';
    default:
      return 'border-blue-500 text-blue-600 hover:bg-blue-50';
  }
};

async function getSemesters(countryCode: string, subjectId: string) {
  try {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.FILTER.SEMESTERS_BY_SUBJECT(subjectId),
      { database: countryCode },
      { next: { revalidate: 300 } } as any
    );

    const semestersData = response.data;
    let semestersList: Semester[] = [];

    if (Array.isArray(semestersData)) {
      semestersList = semestersData;
    } else if (semestersData?.data?.semesters) {
      semestersList = semestersData.data.semesters;
    } else if (Array.isArray(semestersData?.data)) {
      semestersList = semestersData.data;
    } else if (semestersData?.semesters) {
       semestersList = semestersData.semesters;
    }

    return semestersList;
  } catch (err) {
    console.error('Error fetching semesters:', err);
    return [];
  }
}

export default async function SemesterList({ 
  countryCode, 
  subjectId,
  subjectName,
}: { 
  countryCode: string; 
  subjectId: string;
  subjectName: string;
  classId?: string;
}) {
  const semesters = await getSemesters(countryCode, subjectId);

  if (!semesters.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">لا توجد فصول دراسية متاحة حالياً</p>
      </div>
    );
  }

  return (
    <>
      {semesters.map((semester) => (
        <div key={semester.id} className="my-4">
          <div className="row justify-content-center">
            <div className="col-lg-10 mx-auto">
              <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                  <h5 className="font-bold text-xl text-gray-800 mb-6">
                    {semester.semester_name} - {subjectName}
                  </h5>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    {STANDARD_CATEGORIES.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/${countryCode}/lesson/subjects/${subjectId}/articles/${semester.id}/${cat.id}`}
                        className={`px-6 py-2 rounded-lg border transition-all duration-200 font-medium ${getCategoryStyle(cat.id as string)}`}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
