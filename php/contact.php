<?php
/**
 * 100 International Universe — Contact Form Handler
 * Validates brief submission, delivers via mail(), and stores a local JSON copy.
 */

header('Content-Type: application/json; charset=UTF-8');

// Studio recipient email
$recipient = 'studio@100iuniverse.com';

function respond($success, $message) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request method.');
}

$name        = trim($_POST['name'] ?? '');
$email       = trim($_POST['email'] ?? '');
$projectType = trim($_POST['project_type'] ?? 'Not specified');
$message     = trim($_POST['message'] ?? '');

if ($name === '' || $email === '' || $message === '') {
    respond(false, 'Please complete all required fields.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.');
}

// Prepare inquiry data object
$submission = [
    'id'           => uniqid('brief_', true),
    'date'         => date('Y-m-d H:i:s'),
    'name'         => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
    'email'        => htmlspecialchars($email, ENT_QUOTES, 'UTF-8'),
    'project_type' => htmlspecialchars($projectType, ENT_QUOTES, 'UTF-8'),
    'message'      => htmlspecialchars($message, ENT_QUOTES, 'UTF-8'),
    'ip'           => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
];

// Always save submission to local JSON file so leads are never lost (especially on local dev/XAMPP)
$logCandidates = [
    __DIR__ . '/inbox_submissions.json',
    __DIR__ . '/../inbox_submissions.json',
    __DIR__ . '/php/inbox_submissions.json'
];

$savedAny = false;
foreach ($logCandidates as $logFile) {
    $dir = dirname($logFile);
    if (!is_dir($dir)) continue;

    $submissions = [];
    if (file_exists($logFile)) {
        $existing = @file_get_contents($logFile);
        if ($existing) {
            $decoded = json_decode($existing, true);
            if (is_array($decoded)) {
                $submissions = $decoded;
            }
        }
    }
    $submissions[] = $submission;
    $res = @file_put_contents($logFile, json_encode($submissions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($res !== false) {
        $savedAny = true;
    }
}

// Construct email
$subject = '100 International Universe — New Project Brief: ' . $name;
$body  = "=================================================\n";
$body .= "100 INTERNATIONAL UNIVERSE — NEW BRIEF\n";
$body .= "=================================================\n\n";
$body .= "Client Name:  {$name}\n";
$body .= "Client Email: {$email}\n";
$body .= "Project Type: {$projectType}\n";
$body .= "Received At:  " . date('Y-m-d H:i:s') . "\n\n";
$body .= "Brief Details:\n";
$body .= "-------------------------------------------------\n";
$body .= "{$message}\n";
$body .= "-------------------------------------------------\n";

$headers = [
    'From: website@100iuniverse.com',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion()
];

$sent = @mail($recipient, $subject, $body, implode("\r\n", $headers));

if ($sent || $savedAny) {
    respond(true, 'Thanks — your brief has been received. Our producers will reply within one working day.');
} else {
    respond(false, 'Unable to submit brief at this time. Please email studio@100iuniverse.com directly.');
}