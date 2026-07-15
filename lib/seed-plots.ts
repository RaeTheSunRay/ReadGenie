const SEED_PLOTS: Record<string, string> = {
  "Harry Potter and the Sorcerer's Stone|J.K. Rowling": `Harry Potter is a young orphan who lives with the Dursleys, his cruel aunt and uncle. Harry discovers on his eleventh birthday that he is a wizard. Hagrid tells Harry about his magical heritage and his parents who were killed by the dark wizard Voldemort. Harry enters Hogwarts School of Witchcraft and Wizardry because he belongs in the wizarding world. Harry meets Ron Weasley on the train to Hogwarts. Hermione Granger becomes one of Harry's closest friends at school. The three friends learn about the Sorcerer's Stone, which grants immortality. They suspect their teacher Snape wants to steal the stone. Harry, Ron, and Hermione pass through dangerous magical challenges guarding the stone. Hermione solves a logic puzzle that protects the stone. Ron sacrifices himself during a life-sized wizard chess game to help his friends continue. Harry faces Professor Quirrell, who is possessed by Voldemort. Harry defeats Professor Quirrell because the love protection from Harry's mother makes Quirrell burn at Harry's touch. Harry stops Voldemort from returning to power and wins the house cup with his friends.`,

  "The Hobbit|J.R.R. Tolkien": `Bilbo Baggins is a hobbit who enjoys a quiet life in the Shire. Gandalf the wizard arrives with thirteen dwarves led by Thorin Oakenshield. The dwarves recruit Bilbo as a burglar for their quest to reclaim Erebor. The company travels through dangerous lands toward the Lonely Mountain. Bilbo gets lost in goblin tunnels and finds a magic ring. Bilbo meets Gollum and escapes by using the ring to become invisible. Bilbo later uses his wits to help the group escape giant spiders and elven prisons. The dragon Smaug guards the treasure inside the mountain. Bard the archer later slays Smaug and protects Lake-town. Thorin becomes obsessed with the treasure and refuses to share. A battle threatens between dwarves, elves, and men before peace is restored. Bilbo returns home with a share of treasure and a secret magic ring. Gandalf helps Bilbo begin the adventure that changes his quiet life forever.`,

  "Charlotte's Web|E.B. White": `Wilbur is a young pig who is born on the Arable farm. Fern saves Wilbur when he is about to be killed because he is the smallest runt of the litter. Wilbur is later sent to live at the Zuckerman barn. Wilbur feels lonely until he meets Charlotte, a wise spider. Wilbur learns that Mr. Zuckerman plans to slaughter him for food. Charlotte promises to save Wilbur's life. Charlotte weaves words like "Some Pig" into her web above Wilbur's pen because she wants people to see Wilbur as special. People come from far away to see the miraculous pig. Charlotte later lays eggs, but she grows weak and dies. Wilbur protects Charlotte's egg sac through the winter because he wants to honor his closest friend. In spring, Charlotte's children hatch and most leave the barn. Three of Charlotte's daughters stay with Wilbur as his friends. Templeton the rat helps Wilbur by finding words for Charlotte's web.`,

  "Percy Jackson and the Lightning Thief|Rick Riordan": `Percy Jackson is a twelve-year-old boy who struggles in school and often gets into trouble. Percy learns that he is a demigod and the son of Poseidon. Zeus accuses Percy of stealing his master lightning bolt. Percy must travel to the Underworld to find the bolt because a war among the gods could begin. Percy leaves Camp Half-Blood with his friends Annabeth and Grover. Annabeth helps Percy fight monsters with her clever battle plans. Grover protects Percy as they travel across America because Grover is loyal to his friend. The trio faces monsters and gods on their journey across America. They travel to Los Angeles and enter the realm of Hades. Percy discovers the true thief and returns the lightning bolt to Olympus. Percy learns that friendship and loyalty helped him survive the quest. Percy returns to camp and learns more about his powers and family. Annabeth proves her courage during the dangerous quest with Percy and Grover.`,

  "Wonder|R.J. Palacio": `August Pullman is a boy born with facial differences that make him look unusual. Auggie has been homeschooled, but his parents decide he should start fifth grade at Beecher Prep. Auggie is nervous about meeting other students and being accepted. Auggie befriends Jack Will and Summer at school. Julian bullies and excludes Auggie at Beecher Prep because Julian is unkind to students who look different. Via struggles with her own friendships while supporting her brother. The family dog Daisy dies, which deeply hurts the Pullman family. Auggie faces betrayal when he overhears Jack say cruel things about him. Jack later apologizes and their friendship grows stronger because Jack wants to make things right. Summer sits with Auggie at lunch when other students avoid him. Auggie earns respect during a camping trip when he shows courage. At graduation, Auggie receives a special award for kindness and strength. Via stands by Auggie when school becomes difficult for their family.`,

  "Holes|Louis Sachar": `Stanley Yelnats is a boy who believes his family lives under a curse. Stanley is wrongly sent to Camp Green Lake because the police think he stole a pair of shoes. The boys at Camp Green Lake dig holes every day in the hot desert. Zero becomes Stanley's loyal friend at the camp. Stanley teaches Zero how to read because Zero never went to school. The warden makes the boys dig because she wants to find buried treasure. Stanley and Zero escape into the desert together. They climb a mountain and survive by eating onions and drinking water. Stanley and Zero find the treasure that is tied to Stanley's family history. The treasure proves Stanley is innocent and breaks the family curse. Stanley returns home with Zero and shares the reward with his friend.`,

  "Number the Stars|Lois Lowry": `Annemarie Johansen lives in Copenhagen during World War II. Ellen Rosen is Annemarie's best friend and is Jewish. Nazi soldiers begin to hunt Jewish people in Denmark. Ellen moves in with the Johansen family and pretends to be Annemarie's sister because she needs a safe place to hide. Annemarie's older sister Lise died while working with the Resistance. Uncle Henrik helps Jewish families escape by boat to Sweden. Annemarie is asked to deliver a packet to Uncle Henrik because the mission is dangerous. Annemarie finds courage and runs through the woods with the important packet. The packet contains a special handkerchief that helps hide people from the soldiers' dogs. Ellen escapes safely to Sweden with her family. Annemarie learns that ordinary people can be brave during frightening times because friendship and kindness matter.`,

  "Train I Ride|Paul Mosier": `Rydr is a twelve-year-old girl traveling alone by train from Los Angeles to Chicago. Rydr leaves California because her grandmother can no longer take care of her. She carries a backpack, memories, and a mysterious box that matters deeply to her. On the train, Rydr meets Nestle, a kind man who buys her meals and talks with her. Rydr also meets Ace, a teenage traveler who becomes her friend. Dorothea shares comfort and wisdom with Rydr during the long journey. Rydr begins to trust people again because the strangers on the train treat her with kindness. Rydr struggles with grief as she remembers her mother and grandmother. Near the end of the trip, Rydr worries about meeting the relative waiting in Chicago. Nestle helps Rydr feel safer when she is scared and alone. Ace encourages Rydr to open up about her worries. Rydr finally arrives in Chicago and learns that family can be found in unexpected places because love and friendship can grow along the way.`,

  "The Remarkable Journey of Coyote Sunrise|Dan Gemeinhart": `Coyote Sunrise is a twelve-year-old girl traveling the country with her father Rodeo in an old school bus. Years earlier, Coyote's mother and sisters died in a car crash in Oregon. Rodeo changed their names and keeps driving to avoid painful memories from home. Coyote learns that the park in Oregon where she buried a memory box will soon be destroyed. Coyote secretly plans a journey back to Oregon because she needs to dig up the memory box before it is gone. Coyote and Rodeo pick up a musician named Lester who needs to reach Austin. Val joins the bus as a teenage girl running away from problems at home. Salvador and his mother join the trip while escaping a dangerous situation. Coyote helps each new friend solve a problem during the journey. Rodeo becomes angry when he discovers Coyote's secret plan to return to Oregon. Coyote and her friends must work together when the bus breaks down on the road. Coyote finally reaches Oregon and digs up the memory box she buried with her mother and sisters. Coyote and Rodeo begin to heal and talk honestly about their grief because they finally face their memories together. Lester plays music that keeps everyone hopeful during the long trip.`,
};

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lastName(value: string): string {
  const parts = normalizeKeyPart(value).split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** Allow near-miss author spellings like Moiser / Mosier. */
function namesClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (Math.abs(a.length - b.length) > 2) return false;

  let distance = 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) distance += 1;
    if (distance > 2) return false;
  }
  return distance <= 2;
}

export function getSeedPlot(bookTitle: string, author: string): string | null {
  const exact = SEED_PLOTS[`${bookTitle}|${author}`];
  if (exact) return exact;

  const titleKey = normalizeKeyPart(bookTitle);
  const authorLast = lastName(author);

  for (const [key, plot] of Object.entries(SEED_PLOTS)) {
    const [seedTitle, seedAuthor] = key.split("|");
    if (normalizeKeyPart(seedTitle) !== titleKey) continue;
    if (namesClose(authorLast, lastName(seedAuthor))) return plot;
  }

  return null;
}

export function getSeedPlotKeys(): string[] {
  return Object.keys(SEED_PLOTS);
}
