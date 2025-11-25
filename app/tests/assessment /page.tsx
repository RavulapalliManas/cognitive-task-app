"use client";
import AssessmentCanvas from "./canvas";
import { useAssessment } from "./useassessment";

export default function AssessmentPage() {
    const {
        points,
        start,
        recordClick,
        finish
    } = useAssessment();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Assessment</h1>

            <button
                onClick={() => start(1, 1)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
            >
                Start Test
            </button>

            <div className="mt-6">
                <AssessmentCanvas
                    points={points}
                    onClickPoint={recordClick}
                />
            </div>

            <button
                onClick={async () => {
                    const grade = await finish();
                    alert(JSON.stringify(grade, null, 2));
                }}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
            >
                Finish
            </button>
        </div>
    );
}
