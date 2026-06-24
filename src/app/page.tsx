import { TaskRequestForm } from "@/components/task-request-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-8 max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          SilverLink AI
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          어르신께 마음을 전해보세요
        </h1>
        <p className="mt-2 text-slate-500">
          자녀와 관리자가 남겨주신 요청을 저희가 정확하게 전달해 드립니다.
        </p>
      </div>
      <TaskRequestForm />
    </div>
  );
}
