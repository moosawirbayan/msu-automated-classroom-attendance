<?php
/**
 * Enroll Student in a Class
 * Endpoint: POST /enrollments/enroll.php
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../core/Database.php';
require_once '../core/Response.php';
require_once '../core/Validator.php';

$database = new Database();
$db = $database->getConnection();

// Get user ID from token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
$token = str_replace('Bearer ', '', $authHeader);

<?php
/**
 * Enroll Student in a Class
 * Endpoint: POST /enrollments/enroll.php
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../core/Database.php';
require_once '../core/Response.php';
require_once '../core/Validator.php';

$database = new Database();
$db = $database->getConnection();

// Get user ID from token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
$token = str_replace('Bearer ', '', $authHeader);

if (empty($token)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit();
}

$decoded = explode(':', base64_decode($token));
$userId = $decoded[0] ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid token']);
    exit();
}

// Get request data
$data = json_decode(file_get_contents("php://input"));

// Validate input
$validator = new Validator();
$validator->required($data->class_id ?? '', 'class_id');
$validator->required($data->student_id ?? '', 'student_id');
$validator->required($data->first_name ?? '', 'first_name');
$validator->required($data->last_name ?? '', 'last_name');
$validator->required($data->mobile_number ?? '', 'mobile_number');

$parentEmail = trim($data->parent_email ?? '');
if (!empty($parentEmail) && !filter_var($parentEmail, FILTER_VALIDATE_EMAIL)) {
    Response::validationError(['parent_email' => 'Invalid parent email format']);
}

if (!$validator->passes()) {
    Response::validationError($validator->getErrors());
}

try {
    // Verify the class belongs to the instructor
    $verifyStmt = $db->prepare("SELECT id, class_name FROM classes WHERE id = ? AND instructor_id = ?");
    $verifyStmt->execute([$data->class_id, $userId]);
    $class = $verifyStmt->fetch(PDO::FETCH_ASSOC);

    if (!$class) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not have access to this class']);
        exit();
    }

    // Check if student already exists by student_id
    $checkStudent = $db->prepare("SELECT id FROM students WHERE student_id = ?");
    $checkStudent->execute([$data->student_id]);
    $existingStudent = $checkStudent->fetch(PDO::FETCH_ASSOC);

    if ($existingStudent) {
        $studentDbId = $existingStudent['id'];

        // Check if already enrolled in this class
        $checkEnrollment = $db->prepare("SELECT id FROM enrollments WHERE student_id = ? AND class_id = ?");
        $checkEnrollment->execute([$studentDbId, $data->class_id]);

        if ($checkEnrollment->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Student is already enrolled in this class']);
            exit();
        }

        // Keep parent contact details current for existing students.
        $updateStudent = $db->prepare("\n            UPDATE students\n            SET parent_email = COALESCE(NULLIF(?, ''), parent_email),\n                parent_name = COALESCE(NULLIF(?, ''), parent_name),\n                phone = COALESCE(NULLIF(?, ''), phone)\n            WHERE id = ?\n        ");
        $updateStudent->execute([
            $parentEmail,
            $data->parent_name ?? '',
            $data->mobile_number ?? '',
            $studentDbId,
        ]);
    } else {
        // Create new student record
        $insertStudent = $db->prepare("\n            INSERT INTO students (student_id, first_name, middle_initial, last_name, email, parent_email, parent_name, phone, created_at) \n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())\n        ");
        $insertStudent->execute([
            $data->student_id,
            $data->first_name,
            $data->middle_initial ?? null,
            $data->last_name,
            $data->email ?? null,
            !empty($parentEmail) ? $parentEmail : null,
            !empty($data->parent_name) ? trim($data->parent_name) : null,
            $data->mobile_number,
        ]);
        $studentDbId = $db->lastInsertId();
    }

    // Enroll student in class
    $enrollStmt = $db->prepare("\n        INSERT INTO enrollments (student_id, class_id, enrolled_date, status) \n        VALUES (?, ?, NOW(), 'active')\n    ");
    $enrollStmt->execute([$studentDbId, $data->class_id]);

    // Get the complete student record
    $getStudent = $db->prepare("SELECT * FROM students WHERE id = ?");
    $getStudent->execute([$studentDbId]);
    $student = $getStudent->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Student enrolled successfully',
        'student' => $student,
        'class_name' => $class['class_name']
    ]);

} catch (Exception $e) {
    error_log("Enroll student error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while enrolling student: ' . $e->getMessage()]);
}
?>
