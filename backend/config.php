<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

const API_KEY = '9f4c2d8e7a0b1f73c6d41ea0b9f58d3370b2c4f9e6d1a3b487c0f5e29ab37d11';

$_CLIENT_KEY = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($CLIENT_KEY !== API_KEY) {
	http_response_code(401);
	echo json_encode(['error'=>'unauthorized']); exit;
}

$DB_HOST = 'sql205.byetcluster.com';   // à remplacer
$DB_NAME = 'ezyro_39990723_website';                // à remplacer
$DB_USER = 'ezyro_39990723';                // à remplacer
$DB_PASS = 'l6e58X6oG1Ea1l';                // à remplacer

try {
	$pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",$DB_USER,$DB_PASS,[
		PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
	]);
} catch(Exception $e){
	http_response_code(500);
	echo json_encode(['error'=>'db_connect_failed']); exit;
}

function json_input(){
	$raw = file_get_contents('php://input');
	return $raw ? json_decode($raw,true):[];
}
function out($data){ echo json_encode($data); exit; }
?>
