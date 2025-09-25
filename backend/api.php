<?php
require __DIR__.'/config.php';

$entity = $_GET['entity'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$method = $_SERVER['REQUEST_METHOD'];

$tables = [
	'tasks'=>['table'=>'tasks','fields'=>['title','freq_value','freq_unit','room','last_done','finished']],
	'courses'=>['table'=>'courses','fields'=>['title','quantity','category','note','bought']],
	'meals'=>['table'=>'meals','fields'=>['day','moment','meal','week_offset']]
];
if(!isset($tables[$entity])){
	http_response_code(400); out(['error'=>'bad_entity']);
}

$meta = $tables[$entity];

if($method==='GET'){
	if($id){
		$stmt=$pdo->prepare("SELECT * FROM {$meta['table']} WHERE id=?");
		$stmt->execute([$id]);
		out($stmt->fetch() ?: null);
	} else {
		$stmt=$pdo->query("SELECT * FROM {$meta['table']} ORDER BY id DESC");
		out($stmt->fetchAll());
	}
}

$body = json_input();

if($method==='POST'){
	$cols=[];$vals=[];$ph=[];
	foreach($meta['fields'] as $f){
		if(array_key_exists($f,$body)){ $cols[]=$f; $vals[]=$body[$f]; $ph[]='?'; }
	}
	if(!$cols){ http_response_code(422); out(['error'=>'no_fields']); }
	$sql="INSERT INTO {$meta['table']} (".implode(',',$cols).") VALUES (".implode(',',$ph).")";
	$pdo->prepare($sql)->execute($vals);
	out(['id'=>$pdo->lastInsertId()]);
}

if($method==='PUT' || $method==='PATCH'){
	if(!$id){ http_response_code(400); out(['error'=>'missing_id']); }
	$set=[];$vals=[];
	foreach($meta['fields'] as $f){
		if(array_key_exists($f,$body)){ $set[]="$f=?"; $vals[]=$body[$f]; }
	}
	if(!$set){ http_response_code(422); out(['error'=>'no_update']); }
	$vals[]=$id;
	$sql="UPDATE {$meta['table']} SET ".implode(',',$set)." WHERE id=?";
	$pdo->prepare($sql)->execute($vals);
	out(['updated'=>true]);
}

if($method==='DELETE'){
	if(!$id){ http_response_code(400); out(['error'=>'missing_id']); }
	$pdo->prepare("DELETE FROM {$meta['table']} WHERE id=?")->execute([$id]);
	out(['deleted'=>true]);
}

http_response_code(405);
out(['error'=>'method_not_allowed']);
