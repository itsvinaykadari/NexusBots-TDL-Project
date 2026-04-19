/scripts/inject_b2_prompts.js 

Nexus Bots — B2 Prompt Injector
Target : http://localhost:5000/api/ai/chat
Prompts: 70  |  Delay: 3500ms  |  ETA: ~4.1 min
Mode   : LIVE (logs → server/logs/ai_sessions.jsonl)

[ 1/70] [EN] show me all drone robots … ✓ tool=search_products  src=sarvam    19181ms guide=find_drone
[ 2/70] [EN] what's the cheapest robot you have? … ✗ tool=search_products  src=sarvam    2532ms
[ 3/70] [EN] tell me about DJI Matrice 30T … ✓ tool=get_product  src=sarvam    4018ms
[ 4/70] [EN] compare Roomba and Roborock on suction … ✓ tool=compare_products  src=sarvam    3320ms guide=compare_products
[ 5/70] [EN] I want a kitchen robot under $1000 … ✗ tool=search_products  src=sarvam    3595ms guide=find_kitchen
[ 6/70] [EN] add Miko 3 to my cart … ✗ tool=navigate_to  src=sarvam    4021ms guide=update_cart
[ 7/70] [EN] where are my orders? … ✓ tool=navigate_to  src=sarvam    2200ms guide=check_orders
[ 8/70] [EN] I need help with my robot, open support … ✓ tool=navigate_to  src=sarvam    2327ms guide=open_support
[ 9/70] [EN] file a complaint about my order … ✓ tool=navigate_to  src=sarvam    2159ms guide=check_orders
[10/70] [EN] show me my previous tickets … ✗ tool=search_products  src=sarvam    3760ms guide=open_support
[11/70] [EN] where can I find pool cleaning drones? … ✓ tool=navigate_to  src=sarvam    1717ms guide=locate_path:Drone:8
[12/70] [EN] what is the best robot for kids? … ✓ tool=recommend  src=sarvam    3646ms
[13/70] [EN] show me window cleaning robots … ✓ tool=search_products  src=sarvam    2594ms guide=find_home_cleaner
[14/70] [EN] compare DJI Matrice and Ring Always Home Cam on camera … ✓ tool=compare_products  src=sarvam    2926ms guide=compare_products
[15/70] [EN] go to cart … ✓ tool=navigate_to  src=sarvam    2544ms guide=update_cart
[16/70] [EN] what can you tell me about Wonder Workshop Dash? … ✓ tool=get_product  src=sarvam    3467ms
[17/70] [EN] I want a vacuum robot that empties itself … ✓ tool=search_products  src=sarvam    3742ms guide=find_home_cleaner
[18/70] [EN] add LEGO Spike Prime to cart … ✗ tool=search_products  src=sarvam    3992ms guide=find_humanoid
[19/70] [EN] recommend me a security drone under $500 … ✓ tool=recommend  src=sarvam    2325ms
[20/70] [EN] what is the most expensive robot here? … ✓ tool=search_products  src=sarvam    3470ms
[21/70] [EN] take me home … ✓ tool=navigate_to  src=sarvam    2109ms
[22/70] [EN] compare Samsung Ballie and Amazon Astro on price … ✓ tool=compare_products  src=sarvam    2860ms guide=compare_products
[23/70] [EN] where is Aiper Surfer S1? … ✓ tool=navigate_to  src=sarvam    2460ms guide=locate_path:Drone:9
[24/70] [EN] I want to raise a ticket, my robot is broken … ✗ tool=search_products  src=sarvam    1802ms guide=new_ticket
[25/70] [EN] best humanoid robot for classroom use … ✓ tool=recommend  src=sarvam    3724ms
[26/70] [HI] drone robots dikhao … ✓ tool=search_products  src=sarvam    4101ms guide=find_drone
[27/70] [HI] DJI Matrice 30T ke baare mein batao … ✗ tool=search_products  src=sarvam    4161ms guide=find_drone
[28/70] [HI] mera order kahan hai … ✓ tool=navigate_to  src=sarvam    2093ms guide=check_orders
[29/70] [HI] Miko 3 cart mein add karo … ✗ tool=search_products  src=sarvam    3968ms guide=find_humanoid
[30/70] [HI] sasta drone dikhao … ✗ tool=search_products  src=sarvam    3950ms guide=find_drone
[31/70] [HI] Roomba aur Roborock compare karo suction mein … ✓ tool=compare_products  src=sarvam    4069ms guide=compare_products
[32/70] [HI] kitchen robots dikhao … ✓ tool=search_products  src=sarvam    3500ms guide=find_kitchen
[33/70] [HI] mujhe support chahiye … ✗ tool=search_products  src=sarvam    4000ms guide=open_support
[34/70] [HI] complaint file karni hai … ✗ tool=search_products  src=sarvam    2785ms guide=new_ticket
[35/70] [HI] mere purane tickets dikhao … ✗ tool=search_products  src=sarvam    3985ms guide=open_support
[36/70] [HI] drone kahan milega? … ✓ tool=navigate_to  src=sarvam    3035ms guide=locate_path:Drone:8
[37/70] [HI] bacchon ke liye robot suggest karo … ✓ tool=recommend  src=sarvam    4010ms
[38/70] [HI] window cleaning robot chahiye … ✓ tool=search_products  src=sarvam    4001ms guide=find_home_cleaner
[39/70] [HI] $500 ke andar vacuum robot suggest karo … ✓ tool=recommend  src=sarvam    2592ms
[40/70] [HI] Samsung Ballie ke details do … ✓ tool=get_product  src=sarvam    3702ms
[41/70] [HI] Enabot EBO X ko cart mein daal do … ✗ tool=search_products  src=sarvam    3358ms guide=find_kitchen
[42/70] [HI] humanoid robots list karo … ✓ tool=search_products  src=sarvam    3976ms guide=find_humanoid
[43/70] [HI] Amazon Astro aur Samsung Ballie mein kya fark hai … ✗ tool=search_products  src=sarvam    3983ms guide=find_kitchen
[44/70] [HI] mera cart dikhao … ✓ tool=navigate_to  src=sarvam    2842ms guide=update_cart
[45/70] [HI] robot kharaab hai, ticket banao … ✗ tool=search_products  src=sarvam    3994ms guide=open_support
[46/70] [HI] LEGO Spike Prime kahan milega? … ✓ tool=navigate_to  src=sarvam    3109ms guide=locate_path:Humanoid:12
[47/70] [HI] best kitchen robot $1500 mein … ✓ tool=recommend  src=sarvam    4033ms
[48/70] [HI] Wonder Workshop Dash ke baare mein batao … ✗ tool=search_products  src=sarvam    4001ms guide=find_humanoid
[49/70] [HI] DJI Matrice aur Ring Cam camera pe compare karo … ✓ tool=compare_products  src=sarvam    3935ms guide=compare_products
[50/70] [HI] home page pe le chalo … ✗ tool=search_products  src=sarvam    4000ms
[51/70] [TE] drone robots chupinchandi … ✓ tool=search_products  src=sarvam    3927ms guide=find_drone
[52/70] [TE] Miko 3 gurinchi cheppu … ✗ tool=search_products  src=sarvam    3979ms guide=find_humanoid
[53/70] [TE] naa order ekkada undi? … ✗ tool=search_products  src=sarvam    3735ms guide=locate_path:Humanoid:12
[54/70] [TE] Roborock cart lo add cheyyi … ✗ tool=search_products  src=sarvam    3993ms guide=find_home_cleaner
[55/70] [TE] kitchen robots chupinchu … ✓ tool=search_products  src=sarvam    4008ms guide=find_kitchen
[56/70] [TE] support kavali … ✗ tool=search_products  src=sarvam    3978ms guide=open_support
[57/70] [TE] complaint file cheyali … ✗ tool=search_products  src=sarvam    2809ms guide=new_ticket
[58/70] [TE] naa tickets chupinchu … ✗ tool=search_products  src=sarvam    3984ms guide=open_support
[59/70] [TE] drone ekkada dorikutundi … ✓ tool=navigate_to  src=sarvam    2825ms guide=locate_path:Drone:8
[60/70] [TE] pillalaki robot suggest cheyyi … ✓ tool=recommend  src=sarvam    4110ms
[61/70] [TE] $500 lopu vacuum robot kavali … ✗ tool=search_products  src=sarvam    3960ms guide=find_home_cleaner
[62/70] [TE] DJI Matrice 30T gurinchi cheppu … ✗ tool=search_products  src=sarvam    4001ms guide=find_drone
[63/70] [TE] LEGO Spike Prime cart lo pettu … ✗ tool=search_products  src=sarvam    3959ms guide=find_humanoid
[64/70] [TE] humanoid robots list cheyyi … ✓ tool=search_products  src=sarvam    4019ms guide=find_humanoid
[65/70] [TE] Roomba mariyu Roborock ni suction meeda compare cheyyi … ✓ tool=compare_products  src=sarvam    3333ms guide=compare_products
[66/70] [TE] naa cart chupinchu … ✗ tool=search_products  src=sarvam    3276ms guide=find_humanoid
[67/70] [TE] Wonder Workshop Dash ekkada undi? … ✓ tool=navigate_to  src=sarvam    2334ms guide=locate_path:Humanoid:11
[68/70] [TE] robot pani cheyyatledu, ticket create cheyyi … ✗ tool=search_products  src=sarvam    4103ms guide=new_ticket
[69/70] [TE] cheapest humanoid robot cheppu … ✗ tool=search_products  src=sarvam    3986ms guide=find_humanoid
[70/70] [TE] Amazon Astro details ivvu … ✓ tool=get_product  src=sarvam    4007ms

══════════════════════════════════════
B2 Injection Complete
By language: en=25  hi=25  te=20
By tool:     {"search_products":39,"get_product":4,"compare_products":6,"navigate_to":14,"recommend":7}

Mismatches (29):
  [2] [en] "what's the cheapest robot you have?"
       expected=recommend  got=search_products
  [5] [en] "I want a kitchen robot under $1000"
       expected=recommend  got=search_products
  [6] [en] "add Miko 3 to my cart"
       expected=add_to_cart  got=navigate_to
  [10] [en] "show me my previous tickets"
       expected=navigate_to  got=search_products
  [18] [en] "add LEGO Spike Prime to cart"
       expected=add_to_cart  got=search_products
  [24] [en] "I want to raise a ticket, my robot is broken"
       expected=navigate_to  got=search_products
  [27] [hi] "DJI Matrice 30T ke baare mein batao"
       expected=get_product  got=search_products
  [29] [hi] "Miko 3 cart mein add karo"
       expected=add_to_cart  got=search_products
  [30] [hi] "sasta drone dikhao"
       expected=recommend  got=search_products
  [33] [hi] "mujhe support chahiye"
       expected=navigate_to  got=search_products
  [34] [hi] "complaint file karni hai"
       expected=navigate_to  got=search_products
  [35] [hi] "mere purane tickets dikhao"
       expected=navigate_to  got=search_products
  [41] [hi] "Enabot EBO X ko cart mein daal do"
       expected=add_to_cart  got=search_products
  [43] [hi] "Amazon Astro aur Samsung Ballie mein kya fark hai"
       expected=compare_products  got=search_products
  [45] [hi] "robot kharaab hai, ticket banao"
       expected=navigate_to  got=search_products
  [48] [hi] "Wonder Workshop Dash ke baare mein batao"
       expected=get_product  got=search_products
  [50] [hi] "home page pe le chalo"
       expected=navigate_to  got=search_products
  [52] [te] "Miko 3 gurinchi cheppu"
       expected=get_product  got=search_products
  [53] [te] "naa order ekkada undi?"
       expected=navigate_to  got=search_products
  [54] [te] "Roborock cart lo add cheyyi"
       expected=add_to_cart  got=search_products
  [56] [te] "support kavali"
       expected=navigate_to  got=search_products
  [57] [te] "complaint file cheyali"
       expected=navigate_to  got=search_products
  [58] [te] "naa tickets chupinchu"
       expected=navigate_to  got=search_products
  [61] [te] "$500 lopu vacuum robot kavali"
       expected=recommend  got=search_products
  [62] [te] "DJI Matrice 30T gurinchi cheppu"
       expected=get_product  got=search_products
  [63] [te] "LEGO Spike Prime cart lo pettu"
       expected=add_to_cart  got=search_products
  [66] [te] "naa cart chupinchu"
       expected=navigate_to  got=search_products
  [68] [te] "robot pani cheyyatledu, ticket create cheyyi"
       expected=navigate_to  got=search_products
  [69] [te] "cheapest humanoid robot cheppu"
       expected=recommend  got=search_products

These mismatches are the most valuable labeling candidates.

Next: run Task B2 labeling →
  node research/dataset/scripts/label_b2_logs.js